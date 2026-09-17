# n8n-nodes-openanalytics

Query web analytics data from Open Analytics directly within your n8n workflows.

> This is an independent community integration and is not affiliated with, endorsed by, sponsored by, or maintained by OpenLabs or Open Analytics. Product names and marks belong to their respective owners and are used only to identify compatibility.

[Installation](#installation) · [Compatibility](#compatibility) · [Credentials](#credentials) · [Operations](#operations) · [Usage](#usage) · [Troubleshooting](#troubleshooting) · [Resources](#resources) · [Black Swamp AI](https://blackswampai.com/n8n-nodes/openanalytics/)

## Installation

This package is not currently available through verified-node discovery. On self-hosted n8n, open **Settings → Community Nodes**, select **Install**, and enter `n8n-nodes-openanalytics`. For details, see the [n8n community node installation guide](https://docs.n8n.io/integrations/community-nodes/installation-and-management/gui-installation/).

## Compatibility

| Surface             | Tested baseline | Notes                                                          |
| ------------------- | --------------- | -------------------------------------------------------------- |
| n8n                 | >=1.0.0         | Tested against declarative REST execution baseline             |
| Service/API         | v1              | Compatible with Open Analytics Cloud and self-hosted instances |
| Node.js development | 22.22.0 and 24  | CI and package checks run on both lanes.                       |

Do not present verified-node distribution as evidence of broader service, API, or runtime compatibility.

## Credentials

Authenticate requests using an Open Analytics API key:

API keys in Open Analytics are site-bound credentials created per site in **Settings → API**. Each credential configured in n8n maps directly to that specific site. The Open Analytics API automatically scopes all requests to the site tied to the key and does not accept `X-OA-Site` headers.

1. In Open Analytics, navigate to your site's **Settings → API** to create an API key.
2. In n8n, open **Credentials → New Credential**, and choose **Open Analytics API**.
3. Enter your **API Key**.
4. (Optional) Set the **Base URL** to your self-hosted instance (defaults to `https://api.getopen.so`).

All requests include the Bearer token in the `Authorization` header.

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

All revenue operations query data for the site bound to the selected credential:

- **Get Summary (`getSummary`)**: Fetch revenue totals, MRR, paying users, and conversion statistics (`GET /v1/read/revenue/summary`). Supports optional comparison with preceding period and currency filtering.
- **Get Timeseries (`getTimeseries`)**: Fetch time-bucketed revenue metrics (`GET /v1/read/revenue/timeseries`). Supports time resolution (`hour`, `day`) and currency filtering.

## Usage

- **Site-Scoped Credentials**: Open Analytics API keys are generated per site. To query different sites, configure distinct credentials in n8n for each site's API key.
- **Timestamp Formatting**: The `from` and `to` date range parameters require full ISO-8601 UTC timestamp strings (for example, `2026-09-01T00:00:00.000Z`). Date-only strings such as `2026-09-01` return a 400 Bad Request error from the API.
- **Timezone**: Set the `timezone` parameter to a valid IANA timezone identifier (such as `UTC` or `America/New_York`) to control day boundary bucketing.

## Troubleshooting

- Confirm the base URL, account or organization scope, and credential permissions.
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
