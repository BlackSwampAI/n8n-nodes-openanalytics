# Testing strategy for Open Analytics node

## Unit and contract tests

- Use strict TypeScript `*.test.ts` files executed under Vitest.
- Assert resource and operation visibility for `site` (`getAll`, `get`), `analytics` (`getOverview`, `getTimeseries`, `getPages`, `getSources`, `getGeography`, `getDevices`, `getSessions`), and `revenue` (`getSummary`, `getTimeseries`).
- Verify that the required `siteId` node field is visible only for OAuth2 Revenue. API keys remain bound to their site; the same OAuth credential can be used with different site IDs on different nodes.
- Verify `from` and `to` show required metadata and valid ISO-8601 UTC defaults. Invalid timestamps are rejected by the upstream API; this node does not claim local date parsing or non-blank preflight.
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
  - `revenue.getSummary`: `GET /v1/read/revenue/summary` with `from`, `to`, `timezone`, optional `compare`, and retained legacy `currency` query parameter
  - `revenue.getTimeseries`: `GET /v1/read/revenue/timeseries` with `from`, `to`, `timezone`, retained legacy `currency`, and `resolution` (hour, day) query parameters
- Verify API-key requests do not transmit `x-oa-site`. OAuth2 Revenue requests transmit the selected validated site UUID; API key requests remain scoped to their key's site.
- Prove one request/output sequence per input item and verify automatic item lineage remains intact.

### Programmatic execution responsibilities

- All endpoint and query mapping stays declarative, with no custom `execute` or manual HTTP/token handling. Revenue attaches a `preSend` context validator and a bounded one-request pagination callback that wraps n8n `makeRoutingRequest` to sanitize native transport failures while retaining native OAuth refresh and response shaping.
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

| Resource    | Operation       | Parameters & Modes Tested                                                                                                |
| ----------- | --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `site`      | `getAll`        | Default execution, validates accessible site list                                                                        |
| `site`      | `get`           | Default execution, validates metadata payload for credential-bound site                                                  |
| `analytics` | `getOverview`   | `from`/`to` ISO dates, `timezone`, `compare=true`, `resolution` (`day`, `hour`)                                          |
| `analytics` | `getTimeseries` | `from`/`to` ISO dates, `timezone`, `resolution` (`day`, `hour`, `week`)                                                  |
| `analytics` | `getPages`      | `from`/`to` ISO dates, `timezone`                                                                                        |
| `analytics` | `getSources`    | `from`/`to` ISO dates, `timezone`                                                                                        |
| `analytics` | `getGeography`  | `from`/`to` ISO dates, `timezone`                                                                                        |
| `analytics` | `getDevices`    | `from`/`to` ISO dates, `timezone`                                                                                        |
| `analytics` | `getSessions`   | `from`/`to` ISO dates, `timezone`                                                                                        |
| `revenue`   | `getSummary`    | `from`/`to` ISO dates, `timezone`, `compare=true`, Legacy Currency value retained (ignored by v0.8.0)                    |
| `revenue`   | `getTimeseries` | `from`/`to` ISO dates, `timezone`, Legacy Currency value retained (ignored by v0.8.0), `resolution` (`hour`, `day` only) |

#### Cross-Cutting Test Dimensions

- **Credential Scope**: API-key reads use the key's bound site without `x-oa-site`. OAuth2 Revenue sends the node's explicit Site ID; the server checks scope, user principal, live membership, and owner role.
- **Timezone**: Custom timezone identifiers (e.g., `America/New_York`, `UTC`) verifying day-boundary shifts.
- **Comparative Analysis**: `compare=true` verification against previous period on overview and revenue summary.
- **Currency**: v0.8.0 ignores the retained legacy `currency` query value and uses site reporting currency. Other versions are unverified.
- **Error Handling**:
  - Invalid/expired API key produces HTTP 401 Unauthorized with diagnostic message.
  - Invalid date format (e.g. `2026-09-01` without time/Z) produces HTTP 400 Bad Request.
  - Rate limiting behavior producing HTTP 429 with `Retry-After`.

Multipart handling is not applicable to this JSON REST integration. Mocked route and serialization tests are not evidence of live n8n request execution.

### OAuth source contract (not a live smoke)

| Setting          | Released v0.8.0 evidence                                                                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discovery        | `GET /api/auth/.well-known/openid-configuration`                                                                                                                                   |
| Authorization    | `GET /api/auth/oauth2/authorize`                                                                                                                                                   |
| Token            | `POST /api/auth/oauth2/token`                                                                                                                                                      |
| Registration     | `POST /v1/oauth/register`; anonymous public manual registration, no account authentication required; never called by this node (released v0.8.0 source-derived, not hosted-tested) |
| Client policy    | Public only (`token_endpoint_auth_method: none`); exact HTTPS or loopback callback, no wildcards                                                                                   |
| Grants           | `authorization_code`, `refresh_token`; device grant remains first-party only                                                                                                       |
| Requested scopes | `site:read revenue:read offline_access`                                                                                                                                            |
| Token lifetimes  | One-hour access token; 30-day refresh token                                                                                                                                        |

The public API reference examples show `X-OA-Site`, which released key handling rejects when authentication uses an API key. For released v0.8.0, the source-level read-scope and middleware policy are more specific: API keys cannot mint `revenue:read`, Revenue requires a user principal, and the selected site must have a live owner membership. The node validates only the local Site ID UUID; it does not claim to assert token connectivity, user scope, membership, or role. The native n8n credential handles authorization-code PKCE and refresh; this test suite mocks the wrapper boundary and does not claim that the auth browser flow, token refresh, hosted service, or current hosted deployment was exercised.

Immutable sources: [released key handling](https://github.com/OpenLabs-so/openanalytics/blob/a07da7020810d3a975524daad2a544c9205ea65e/apps/api/src/http/read-key.ts), [released scopes](https://github.com/OpenLabs-so/openanalytics/blob/a07da7020810d3a975524daad2a544c9205ea65e/packages/domain/src/read-scopes.ts), [released middleware](https://github.com/OpenLabs-so/openanalytics/blob/a07da7020810d3a975524daad2a544c9205ea65e/apps/api/src/http/middleware.ts), [OAuth client registration policy](https://github.com/OpenLabs-so/openanalytics/blob/a07da7020810d3a975524daad2a544c9205ea65e/packages/domain/src/oauth-registration.ts), [auth provider configuration](https://github.com/OpenLabs-so/openanalytics/blob/a07da7020810d3a975524daad2a544c9205ea65e/packages/auth/src/better-auth.ts), and [registration route](https://github.com/OpenLabs-so/openanalytics/blob/a07da7020810d3a975524daad2a544c9205ea65e/apps/api/src/http/oauth-register.ts). n8n OAuth behavior was checked at [credential definitions](https://github.com/n8n-io/n8n/blob/dcba26c8a530d63041cd8298b8b30295d5476f6f/packages/nodes-base/credentials/OAuth2Api.credentials.ts), [OAuth controller](https://github.com/n8n-io/n8n/blob/dcba26c8a530d63041cd8298b8b30295d5476f6f/packages/cli/src/controllers/oauth/oauth2-credential.controller.ts), [OAuth request helper](https://github.com/n8n-io/n8n/blob/dcba26c8a530d63041cd8298b8b30295d5476f6f/packages/core/src/execution-engine/node-execution-context/utils/request-helpers/oauth.ts), [token refresh](https://github.com/n8n-io/n8n/blob/dcba26c8a530d63041cd8298b8b30295d5476f6f/packages/@n8n/client-oauth2/src/client-oauth2-token.ts), and [declarative routing](https://github.com/n8n-io/n8n/blob/dcba26c8a530d63041cd8298b8b30295d5476f6f/packages/core/src/execution-engine/routing-node.ts). The package changes were unit- and metadata-tested only; no real n8n editor smoke was performed.

## Actual n8n and package smoke

- Build, execute the pinned official `@n8n/scan-community-package` scanner, inspect dry-run tarball boundaries, and load all compiled registrations via `scripts/node-load-smoke.mjs`.
- Install the packed tarball in an isolated temporary consumer project using `scripts/package-install-smoke.mjs`.
- In a disposable n8n instance, verify credential configuration, node discovery under the Analytics category, operation selection, parameter defaults, and execution against the Open Analytics API.
- Submit only the exact published package version, then visually inspect the Creator Portal card version and logo to verify metadata synchronization.

## Publication verification

Before a release, qualify OAuth sign-in, token refresh, and `X-OA-Site` in a real n8n instance, and qualify the hosted `publish` workflow through its real tag-triggered path. Those checks remain pending. The release-tag guard was run locally against the existing annotated `v0.1.1` tag, which is only a partial check and does not qualify GitHub Actions checkout or publication behavior. Do not retag or reuse that version.

- Execute `npm run release` within an immutable, tag-triggered `publish` GitHub Actions job with scoped OIDC permissions (`id-token: write`).
- Run `npm run scan:published` only in a fresh, read-only `verify-published` job that depends on `publish` and performs its own checkout, Node setup, and `npm ci`.
- If verification fails after npm publication, inspect registry status and rerun only the failed verification job; never rerun a successful publish job for an existing version.
- Treat only documented registry metadata replication lag as retryable.

### Source and package template checks

Run `npm run review:source` before build. It statically rejects empty property-only placeholders, and the compiled load smoke checks case-exact filename-derived constructors while treating redundant aliases as template hygiene rather than an n8n loader rule. Unit and metadata tests do not establish real editor or API behavior.

For editor qualification, `npm run dev -- --custom-user-folder "$PWD/.codex-scratch/n8n-node-run"` uses port 5690; open it manually because the CLI browser shortcut targets 5678. If 5690 is occupied, run `N8N_PORT=5692 npm exec -- n8n-node dev --custom-user-folder "$PWD/.codex-scratch/n8n-node-run"` explicitly; never touch an existing service on 5678.

## Revenue OAuth and compatibility evidence

The OAuth credential uses public-client PKCE, fixed `site:read revenue:read offline_access` scopes, and already-registered client IDs. The exact n8n callback must be included during client registration; there is no client registration call in the node. The pagination callback delegates to n8n's `makeRoutingRequest` once and catches its failure boundary; n8n may make an internal token-refresh HTTP request, so this count is not a total network-request guarantee. Mocks verify this delegation and sanitized status mapping, not OAuth authorization, refresh, membership, or hosted API behavior.

Source review used released Open Analytics v0.8.0 (`a07da7020810d3a975524daad2a544c9205ea65e`, released 2026-09-19; latest stable release rechecked 2026-10-07), upstream main reviewed on 2026-10-05 (`f7fc9169f32d48e55eb9106bceae9e87b6aa6bb9`), and n8n stable (`dcba26c8a530d63041cd8298b8b30295d5476f6f`, 2.41.7). The released Revenue middleware requires `revenue:read`, a user principal, a canonical site UUID, live membership, and owner role; released API keys are site-bound and cannot mint that scope. The reviewed main's compared auth files show no relevant change. Hosted service behavior, self-hosted versions, n8n editor experience, and end-to-end token refresh remain unverified.

A read-only comparison on 2026-10-07 found these three files byte-identical between n8n 2.41.7 (`dcba26c8a530d63041cd8298b8b30295d5476f6f`) and 2.42.4 (`fb591534364747f97b1de9e14305255d4aa8d4e2`): [routing-node.ts](https://github.com/n8n-io/n8n/blob/fb591534364747f97b1de9e14305255d4aa8d4e2/packages/core/src/execution-engine/routing-node.ts), [credentials-tester.service.ts](https://github.com/n8n-io/n8n/blob/fb591534364747f97b1de9e14305255d4aa8d4e2/packages/cli/src/services/credentials-tester.service.ts), and [GitlabOAuth2Api.credentials.ts](https://github.com/n8n-io/n8n/blob/fb591534364747f97b1de9e14305255d4aa8d4e2/packages/nodes-base/credentials/GitlabOAuth2Api.credentials.ts). This comparison did not review token-refresh code at 2.42.4 and does not establish live editor behavior; no live editor or refresh flow was run.
