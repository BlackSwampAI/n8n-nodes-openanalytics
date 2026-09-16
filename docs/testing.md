# Testing strategy for Open Analytics node

## Unit and contract tests

- Use strict TypeScript `*.test.ts` files executed under Vitest.
- Assert resource and operation visibility for `site` (`getAll`, `get`) and `analytics` (`getOverview`, `getTimeseries`, `getPages`, `getSources`, `getGeography`, `getDevices`, `getSessions`).
- Validate that `siteId` is required on `site.get` and all `analytics` operations.
- Ensure `from` and `to` date range controls default to valid ISO-8601 UTC timestamp expressions and require non-blank strings before transport.
- Verify `timezone` defaults to `UTC` and accepts standard IANA timezone identifiers.
- Test error payloads matching `{ error: { code, message } }` with appropriate status code handling (400 for invalid dates, 401 for unauthorized, 429 for rate limiting with `Retry-After`).

### Declarative routing contracts

- Assert `requestDefaults` produces `baseURL: ={{$credentials?.baseUrl || "https://api.getopen.so"}}` and JSON content negotiation headers (`Accept`, `Content-Type`).
- Verify credential authentication header generates `Authorization: Bearer {{$credentials.apiKey}}`.
- Verify operation routing paths:
  - `site.getAll`: `GET /v1/read/sites`
  - `site.get`: `GET /v1/read/site` with `x-oa-site: ={{$parameter.siteId}}` header
  - `analytics.*`: `GET /v1/read/analytics/:operation` with `x-oa-site` header and `from`, `to`, `timezone` query parameters
  - `analytics.getOverview`: optional `compare` and `grain` query parameters
  - `analytics.getTimeseries`: optional `grain` query parameter
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
