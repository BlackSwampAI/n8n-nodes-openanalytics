# @blackswampai/n8n-nodes-openanalytics

Query web analytics data from Open Analytics directly within your n8n workflows.

> This is an independent community integration and is not affiliated with, endorsed by, sponsored by, or maintained by OpenLabs or Open Analytics. Product names and marks belong to their respective owners and are used only to identify compatibility.

[Installation](#installation) · [Compatibility](#compatibility) · [Credentials](#credentials) · [Operations](#operations) · [Usage](#usage) · [Troubleshooting](#troubleshooting) · [Resources](#resources) · [Black Swamp AI](https://blackswampai.com/n8n-nodes/openanalytics/)

## Installation

This package is not currently available through verified-node discovery. On self-hosted n8n, open **Settings → Community Nodes**, select **Install**, and enter `@blackswampai/n8n-nodes-openanalytics`. For details, see the [n8n community node installation guide](https://docs.n8n.io/integrations/community-nodes/installation-and-management/gui-installation/).

## Compatibility

| Surface             | Tested baseline                        | Notes                                                                                                              |
| ------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| n8n                 | 2.41.7 source reviewed                 | OAuth credential and routing implementation reviewed against this pinned release; no live editor smoke is claimed. |
| n8n-workflow peer   | 2.37.4 used in tests                   | Unit, metadata, and expression contracts only; this does not establish runtime behavior in an n8n instance.        |
| Open Analytics API  | API v1; service v0.8.0 source reviewed | Released key-based Revenue incompatibility is documented below; no hosted instance smoke is claimed.               |
| Node.js development | 22.22.0 and 24                         | CI and package checks run on both lanes.                                                                           |

Do not present verified-node distribution as evidence of broader service, API, or runtime compatibility.

This package is independent of OpenLabs and its products. Source review separates the [released Open Analytics v0.8.0 source](https://github.com/OpenLabs-so/openanalytics/tree/a07da7020810d3a975524daad2a544c9205ea65e) from [current main at the review date](https://github.com/OpenLabs-so/openanalytics/compare/a07da7020810d3a975524daad2a544c9205ea65e...f7fc9169f32d48e55eb9106bceae9e87b6aa6bb9); neither establishes hosted deployment behavior. The n8n OAuth implementation was source-reviewed at [n8n 2.41.7](https://github.com/n8n-io/n8n/tree/dcba26c8a530d63041cd8298b8b30295d5476f6f). See the [API matrix](docs/api-matrix.md) and [testing notes](docs/testing.md) for exact source links and unverified surfaces.

Known limitation: Open Analytics [issue #10](https://github.com/OpenLabs-so/openanalytics/issues/10) proposes workspace-related changes that may affect owner and site-selection semantics if shipped. This integration does not implement those proposed changes; recheck compatibility if that work is released.

## Credentials

Authenticate requests using an Open Analytics API key:

Released Open Analytics v0.8.0 API keys are site-bound credentials created per site in **Settings → API**. Each API credential configured in n8n maps directly to that site. This release scopes key-authenticated reads to the key site and rejects `X-OA-Site` with API-key authentication. OAuth2 Revenue instead sends the Site ID entered on that node.

1. In Open Analytics, navigate to your site's **Settings → API** to create an API key.
2. In n8n, open **Credentials → New Credential**, and choose **Open Analytics API**.
3. Enter your **API Key**.
4. (Optional) Set the **Base URL** to your self-hosted instance (defaults to `https://api.getopen.so`).

API-key requests include the Bearer token in the `Authorization` header.

Revenue also offers an optional **Open Analytics OAuth2 API** credential using public-client PKCE. Released Open Analytics v0.8.0 accepts an OAuth user or signed-in session user with `revenue:read` and owner membership; this node supports the OAuth user path only. Site-bound API keys cannot mint that scope. The public API reference's `X-OA-Site` examples conflict with v0.8.0 key handling, which rejects that header for API-key auth.

Register a public OAuth client on your Open Analytics installation first. The released v0.8.0 registration endpoint is public and anonymous; it does not require an Open Analytics account or administrator. It is rate-limited per IP and responds with HTTP 429 and `Retry-After` when limited. Before submitting the request, replace the entire example redirect URI with the exact OAuth Redirect URL shown by your n8n OAuth credential screen. For n8n, use an exact HTTPS or loopback callback URL without wildcards. The upstream registration policy also supports native private-use schemes; n8n uses a web callback. Registered clients use `authorization_code` and `refresh_token` grants. This node does not call the registration endpoint or reuse first-party CLI/MCP clients.

For the hosted service, send the request to `https://api.getopen.so/v1/oauth/register`. For self-hosting, replace that base URL with the same Open Analytics installation configured in the n8n credential. This example is derived from released v0.8.0 source and has not been executed against the hosted service:

```sh
curl --request POST 'https://api.getopen.so/v1/oauth/register' \
  --header 'Content-Type: application/json' \
  --data '{
    "client_name": "n8n",
    "redirect_uris": ["https://<your-n8n>/rest/oauth2-credential/callback"],
    "token_endpoint_auth_method": "none",
    "grant_types": ["authorization_code", "refresh_token"],
    "scope": "site:read revenue:read offline_access"
  }'
```

Copy the returned `client_id` into the n8n credential's **Client ID**, enter the canonical Site ID UUID on each Revenue node, then connect the credential by signing in with an account that owns the selected site. Registration creates a public OAuth client; it does not grant Revenue access. See the [released registration route](https://github.com/OpenLabs-so/openanalytics/blob/a07da7020810d3a975524daad2a544c9205ea65e/apps/api/src/http/oauth-register.ts) and [client policy](https://github.com/OpenLabs-so/openanalytics/blob/a07da7020810d3a975524daad2a544c9205ea65e/packages/domain/src/oauth-registration.ts).

Set the credential's Base URL to your Open Analytics installation; the hidden authorization and token URLs derive from that value. The default Base URL is `https://api.getopen.so`, with authorization and token endpoints at `/api/auth/oauth2/authorize` and `/api/auth/oauth2/token`. Discovery on that installation is at `/api/auth/.well-known/openid-configuration`. Released source configures one-hour access tokens and 30-day refresh tokens; actual hosted deployment behavior is unverified. Open Analytics checks current membership and owner role on every Revenue request.

The n8n PKCE integration was source-reviewed against 2.41.7; it has not been verified in a live editor or hosted service.

## Local development

Run `npm run dev -- --custom-user-folder "$PWD/.codex-scratch/n8n-node-run"` to start an isolated local n8n instance on port 5690. Open `http://localhost:5690` manually; the CLI browser shortcut targets port 5678. Never attach to or stop an existing service on 5678. If 5690 is occupied, report the conflict and explicitly run `N8N_PORT=5692 npm exec -- n8n-node dev --custom-user-folder "$PWD/.codex-scratch/n8n-node-run"`; do not fall back silently.

## Operations

### Site

- **Get Many (`getAll`)**: Retrieve all sites accessible by the current credential (`GET /v1/read/sites`).
- **Get (`get`)**: Fetch metadata and tracking script installation details for the credential-bound site (`GET /v1/read/site`).

### Analytics

All analytics operations query data for the site bound to the selected credential:

- **Get Overview (`getOverview`)**: Fetch aggregate metrics including events, pageviews, and unique visitors (`GET /v1/read/analytics/overview`). Supports optional comparison with preceding period and time resolution (`hour`, `day`).
- **Get Timeseries (`getTimeseries`)**: Fetch time-series metric data points (`GET /v1/read/analytics/timeseries`). Supports time resolution (`hour`, `day`, `week`).
- **Get Pages (`getPages`)**: Top pages breakdown ranked by views and visitors (`GET /v1/read/analytics/pages`).
- **Get Sources (`getSources`)**: Breakdown of inbound referrers and campaigns (`GET /v1/read/analytics/sources`).
- **Get Geography (`getGeography`)**: Breakdown of visits by country and city (`GET /v1/read/analytics/geography`).
- **Get Devices (`getDevices`)**: Breakdown of device types, browsers, and operating systems (`GET /v1/read/analytics/devices`).
- **Get Sessions (`getSessions`)**: Bounce rate and visit duration engagement metrics (`GET /v1/read/analytics/sessions`).

### Revenue

Revenue API keys remain bound to their key's site. OAuth2 Revenue sends the Site ID entered on the node:

- **Get Summary (`getSummary`)**: Fetch revenue totals and optional comparison with the preceding period (`GET /v1/read/revenue/summary`).
- **Get Timeseries (`getTimeseries`)**: Fetch time-bucketed revenue metrics (`GET /v1/read/revenue/timeseries`). Supports time resolution (`hour`, `day`).

The retained **Legacy Currency** control preserves saved workflow configuration. Open Analytics v0.8.0 ignores the `currency` query value and reports the site's configured reporting currency; behavior on other versions and self-hosted implementations is unverified.

## Usage

- **Site-Scoped Credentials**: Open Analytics API keys are generated per site. To query different sites, configure distinct credentials in n8n for each site's API key.
- **Revenue Authorization**: Keep API Key selected for Site and Analytics. Select **OAuth2 (Revenue Only)** for Revenue. For workflows created before the authentication selector existed, its default remains API Key.
- **Timestamp Formatting**: The `from` and `to` date range parameters require full ISO-8601 UTC timestamp strings (for example, `2026-09-01T00:00:00.000Z`). Date-only strings such as `2026-09-01` return a 400 Bad Request error from the API.
- **Timezone**: Set the `timezone` parameter to a valid IANA timezone identifier (such as `UTC` or `America/New_York`) to control day boundary bucketing.

## Troubleshooting

- Confirm the base URL, account or organization scope, and credential permissions.
- Revenue API-key requests may receive 403 on released Open Analytics v0.8.0. Use a registered public OAuth2 client with `revenue:read` and an account that is an owner of the selected site. Reconnect an expired OAuth credential; the server evaluates current membership for each request.
- Verify that `from` and `to` timestamps are valid ISO-8601 UTC strings ending with `Z`.
- Check HTTP 429 responses for `Retry-After` header values when approaching rate limits.
- Report reproducible defects in [GitHub Issues](https://github.com/BlackSwampAI/n8n-nodes-openanalytics/issues) without including secrets.

## Resources

- [Black Swamp AI package page](https://blackswampai.com/n8n-nodes/openanalytics/)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [Changelog](CHANGELOG.md)
- [API and operation matrix](docs/api-matrix.md)
- [Compatibility and testing notes](docs/testing.md)
- [Branding and independence notes](docs/branding.md)
- [Open Analytics API Documentation](https://getopen.so/docs/api)

## License

[MIT](LICENSE.md)
