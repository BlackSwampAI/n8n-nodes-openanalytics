import type {
	DeclarativeRestApiSettings,
	IExecutePaginationFunctions,
	IExecuteSingleFunctions,
	INodeExecutionData,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

const SITE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

function localError(context: IExecuteSingleFunctions, message: string): NodeOperationError {
	return new NodeOperationError(context.getNode(), message);
}

export function validateRevenueSiteId(value: unknown): string {
	if (typeof value !== 'string' || !SITE_UUID.test(value.trim())) {
		throw new Error('OAuth2 Revenue requires a Site ID containing a canonical UUID.');
	}
	return value.trim().toLowerCase();
}

export async function prepareRevenueRequest(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const authMode = this.getNodeParameter('authentication', 'apiKey') as string;
	if (authMode !== 'oauth2') return requestOptions;

	try {
		const siteId = this.getNodeParameter('siteId', '') as string;
		requestOptions.headers = {
			...requestOptions.headers,
			'X-OA-Site': validateRevenueSiteId(siteId),
		};
		return requestOptions;
	} catch {
		throw localError(this, 'OAuth2 Revenue requires a Site ID containing a canonical UUID.');
	}
}

export async function guardNonRevenueOAuth(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const authMode = this.getNodeParameter('authentication', 'apiKey') as string;
	const resource = this.getNodeParameter('resource', 'analytics') as string;
	if (authMode === 'oauth2' && resource !== 'revenue') {
		throw localError(
			this,
			'OAuth2 is supported for Revenue only. Select API Key for Analytics and Site requests.',
		);
	}
	return requestOptions;
}

function getStatusCode(error: unknown): number | undefined {
	if (typeof error !== 'object' || error === null) return undefined;
	const value = error as {
		httpCode?: unknown;
		statusCode?: unknown;
		response?: { statusCode?: unknown };
	};
	for (const candidate of [
		value.httpCode,
		value.statusCode,
		value.response?.statusCode,
		(value.response as { status?: unknown } | undefined)?.status,
	]) {
		const status = typeof candidate === 'string' ? Number(candidate) : candidate;
		if (typeof status === 'number' && Number.isInteger(status)) return status;
	}
	return undefined;
}

export async function revenueRequestBoundary(
	this: IExecutePaginationFunctions,
	request: DeclarativeRestApiSettings.ResultOptions,
): Promise<INodeExecutionData[]> {
	try {
		return await this.makeRoutingRequest(request);
	} catch (error) {
		const authMode = this.getNodeParameter('authentication', 'apiKey') as string;
		const status = getStatusCode(error);
		let message =
			authMode === 'oauth2'
				? 'Open Analytics Revenue request failed. Check the OAuth2 connection, client settings, and API base URL.'
				: 'Open Analytics Revenue request failed. Check the base URL and try again.';
		if (status === 401) {
			message =
				authMode === 'oauth2'
					? 'Open Analytics rejected the Revenue OAuth2 access. Reconnect the OAuth2 credential and confirm its registered client settings.'
					: 'Open Analytics rejected the Revenue API key. Check that the key is valid and belongs to an active site.';
		} else if (status === 403) {
			message =
				authMode === 'oauth2'
					? 'Open Analytics denied Revenue access. Confirm the OAuth client has revenue:read scope and your account has an owner role on the selected site.'
					: 'This server denied Revenue access for the API key. Some Open Analytics releases require a registered OAuth2 client with revenue:read scope and an owner role on the selected site; other server implementations may differ.';
		} else if (status === 400) {
			message =
				authMode === 'oauth2'
					? 'Open Analytics rejected the Revenue request or OAuth refresh. Check the date range, timezone, and operation parameters; if token refresh failed, reconnect the OAuth2 credential.'
					: 'Open Analytics rejected the Revenue request. Check the date range, timezone, and selected operation parameters.';
		} else if (status === 404 && authMode === 'oauth2') {
			message =
				'Open Analytics could not find the selected site or live membership. Check the Site ID, account access, and API base URL.';
		} else if (status === 429) {
			message = 'Open Analytics rate limited the Revenue request. Wait before retrying.';
		}
		const validStatus = status !== undefined && status >= 100 && status <= 599;
		const statusHint = validStatus ? ` (HTTP ${status})` : '';
		throw new NodeOperationError(this.getNode(), `${message}${statusHint}`, {
			description: validStatus ? `HTTP ${status}` : undefined,
		});
	}
}
