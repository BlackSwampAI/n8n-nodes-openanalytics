# Testing strategy for Open Analytics node

## Unit and contract tests

- Use strict TypeScript `*.test.ts` files executed under Vitest.
- Assert resource and operation visibility for `site` (`getAll`, `get`), `analytics` (`getOverview`, `getTimeseries`, `getPages`, `getSources`, `getGeography`, `getDevices`, `getSessions`), and `revenue` (`getSummary`, `getTimeseries`).
- Validate that `siteId` is not present on any resource because Open Analytics API keys are site-bound credentials.
- Ensure `from` and `to` date range controls default to valid ISO-8601 UTC timestamp expressions and require non-blank strings before transport on analytics and revenue operations.
- Verify `timezone` defaults to `UTC` and accepts standard IANA timezone identifiers.
- Test error payloads matching `{ error: { code, message } }` with appropriate status code handling (400 for invalid dates, 401 for unauthorized, 429 for rate limiting with `Retry-After`).

### Declarative routing contracts

- Assert `requestDefaults` produces `baseURL: ={{$credentials?.baseUrl || "https://api.getopen.so"}}` and JSON content negotiation headers (`Accept`, `Content-Type`).
- Verify credential authentication header generates `Authorization: Bearer {{$credentials.apiKey}}`.
- Verify operation routing paths:
  - `site.getAll`: `GET /v1/read/sites`
  - `site.get`: `GET /v1/read/site`
  - `analytics.*`: `GET /v1/read/analytics/:operation` with `from`, `to`, `timezone` query parameters
  - `analytics.getOverview`: optional `compare` and `resolution` query parameters
  - `analytics.getTimeseries`: optional `resolution` query parameter
  - `revenue.getSummary`: `GET /v1/read/revenue/summary` with `from`, `to`, `timezone`, and optional `compare`, `currency` query parameters
  - `revenue.getTimeseries`: `GET /v1/read/revenue/timeseries` with `from`, `to`, `timezone`, and optional `currency`, `resolution` (hour, day) query parameters
- Verify that no requests transmit `x-oa-site` headers because Open Analytics API keys scope queries to a single site automatically.
- Prove one request/output sequence per input item and verify automatic item lineage remains intact.

### Programmatic execution responsibilities

- The Open Analytics node is 100% declarative and defines no custom `execute` or programmatic methods.
- Declarative routing directly handles authentication, headers, query parameters, and JSON payloads natively within the n8n engine.
- If future operations require complex stream parsing or binary export, document the programmatic requirement in the API matrix before implementing custom execution functions. Any future programmatic exception must prove execution does not mutate input items and preserves paired-item lineage.

## Disposable service tests

- For end-to-end service testing, target a disposable or local self-hosted Open Analytics instance.
- Fail closed unless the base URL and API key point to an isolated test site.
- Use run-scoped test site IDs created specifically for integration suites.
- Clean up test sites and tokens in dependency order after test completion.
- Separate generated contract validation from observed service behavior and maintain test independence.

### Manual live qualification matrix

Prior to release tagging, complete manual verification across all advertised operations in a running n8n instance against live service:

| Resource    | Operation       | Parameters & Modes Tested                                                               |
| ----------- | --------------- | --------------------------------------------------------------------------------------- |
| `site`      | `getAll`        | Default execution, validates accessible site list                                       |
| `site`      | `get`           | Default execution, validates metadata payload for credential-bound site                 |
| `analytics` | `getOverview`   | `from`/`to` ISO dates, `timezone`, `compare=true`, `resolution` (`day`, `hour`)         |
| `analytics` | `getTimeseries` | `from`/`to` ISO dates, `timezone`, `resolution` (`day`, `hour`, `week`)                 |
| `analytics` | `getPages`      | `from`/`to` ISO dates, `timezone`                                                       |
| `analytics` | `getSources`    | `from`/`to` ISO dates, `timezone`                                                       |
| `analytics` | `getGeography`  | `from`/`to` ISO dates, `timezone`                                                       |
| `analytics` | `getDevices`    | `from`/`to` ISO dates, `timezone`                                                       |
| `analytics` | `getSessions`   | `from`/`to` ISO dates, `timezone`                                                       |
| `revenue`   | `getSummary`    | `from`/`to` ISO dates, `timezone`, `compare=true`, `currency` filter                    |
| `revenue`   | `getTimeseries` | `from`/`to` ISO dates, `timezone`, `currency` filter, `resolution` (`hour`, `day` only) |

#### Cross-Cutting Test Dimensions

- **Credential Scope**: Verify queries automatically scope to the site associated with the configured API key without `x-oa-site` header.
- **Timezone**: Custom timezone identifiers (e.g., `America/New_York`, `UTC`) verifying day-boundary shifts.
- **Comparative Analysis**: `compare=true` verification against previous period on overview and revenue summary.
- **Currency Filtering**: 3-letter currency filtering (e.g. `USD`, `EUR`) on revenue endpoints.
- **Error Handling**:
  - Invalid/expired API key produces HTTP 401 Unauthorized with diagnostic message.
  - Invalid date format (e.g. `2026-09-01` without time/Z) produces HTTP 400 Bad Request.
  - Rate limiting behavior producing HTTP 429 with `Retry-After`.

## Actual n8n and package smoke

- Build, execute the pinned official `@n8n/scan-community-package` scanner, inspect dry-run tarball boundaries, and load all compiled registrations via `scripts/node-load-smoke.mjs`.
- Install the packed tarball in an isolated temporary consumer project using `scripts/package-install-smoke.mjs`.
- In a disposable n8n instance, verify credential configuration, node discovery under the Analytics category, operation selection, parameter defaults, and execution against the Open Analytics API.
- Submit only the exact published package version, then visually inspect the Creator Portal card version and logo to verify metadata synchronization.

## Publication verification

- Execute `npm run release` within an immutable, tag-triggered `publish` GitHub Actions job with scoped OIDC permissions (`id-token: write`).
- Run `npm run scan:published` only in a fresh, read-only `verify-published` job that depends on `publish` and performs its own checkout, Node setup, and `npm ci`.
- If verification fails after npm publication, inspect registry status and rerun only the failed verification job; never rerun a successful publish job for an existing version.
- Treat only documented registry metadata replication lag as retryable.
