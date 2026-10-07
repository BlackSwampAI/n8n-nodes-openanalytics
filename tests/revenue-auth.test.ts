import { describe, expect, it, vi } from 'vitest';
import {
	Expression,
	NodeHelpers,
	NodeOperationError,
	type IExecutePaginationFunctions,
	type IHttpRequestOptions,
} from 'n8n-workflow';
import { OpenAnalytics } from '../nodes/OpenAnalytics/OpenAnalytics.node';
import { OpenAnalyticsOAuth2Api } from '../credentials/OpenAnalyticsOAuth2Api.credentials';
import { OpenAnalyticsApi } from '../credentials/OpenAnalyticsApi.credentials';
import {
	guardNonRevenueOAuth,
	prepareRevenueRequest,
	revenueRequestBoundary,
	validateRevenueSiteId,
} from '../nodes/OpenAnalytics/revenue-auth';

const node = new OpenAnalytics();
const cred = new OpenAnalyticsOAuth2Api();
const sampleSiteId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const baseRequest: IHttpRequestOptions = {
	url: '/v1/read/revenue/summary',
	headers: { Accept: 'application/json' },
};

function context(
	options: {
		authentication?: string;
		resource?: string;
		siteId?: string;
		credentials?: Record<string, unknown>;
		credentialLookup?: (name: string) => Promise<unknown>;
		request?: (request: unknown) => Promise<unknown>;
	} = {},
) {
	return {
		getNodeParameter: (name: string, fallbackOrIndex?: unknown) => {
			if (name === 'authentication') return options.authentication ?? fallbackOrIndex ?? 'apiKey';
			if (name === 'resource') return options.resource ?? 'revenue';
			if (name === 'siteId') return options.siteId ?? fallbackOrIndex ?? '';
			return fallbackOrIndex;
		},
		getCredentials:
			options.credentialLookup ?? vi.fn(async (name: string) => options.credentials?.[name] ?? {}),
		getNode: () => ({
			name: 'Open Analytics',
			type: 'n8n-nodes-openanalytics.openAnalytics',
			typeVersion: 1,
		}),
		makeRoutingRequest:
			options.request ??
			vi.fn(async () => [{ json: { totals: { net: 12 } }, pairedItem: { item: 0 } }]),
	} as unknown as IExecutePaginationFunctions;
}

describe('Open Analytics Revenue authentication contracts', () => {
	it('registers a public PKCE OAuth2 credential without secret or dynamic registration', () => {
		expect(cred.name).toBe('openAnalyticsOAuth2Api');
		expect(cred.extends).toEqual(['oAuth2Api']);
		expect(cred.icon).toEqual({
			light: 'file:../icons/openanalytics.svg',
			dark: 'file:../icons/openanalytics.dark.svg',
		});
		expect(cred.properties.find((property) => property.name === 'grantType')?.default).toBe('pkce');
		expect(cred.properties.find((property) => property.name === 'authentication')?.default).toBe(
			'body',
		);
		expect(cred.properties.find((property) => property.name === 'scope')?.default).toBe(
			'site:read revenue:read offline_access',
		);
		expect(cred.properties.find((property) => property.name === 'clientSecret')).toMatchObject({
			type: 'hidden',
			default: '',
		});
		expect(
			cred.properties.find((property) => property.name === 'useDynamicClientRegistration')?.default,
		).toBe(false);
		expect(cred.properties.some((property) => property.name === 'siteId')).toBe(false);
		expect(cred.properties.find((property) => property.name === 'authUrl')).toMatchObject({
			type: 'hidden',
			default: expect.stringContaining('/api/auth/oauth2/authorize'),
		});
		expect(cred.properties.find((property) => property.name === 'authUrl')?.default).toContain(
			'$self["baseUrl"]',
		);
		expect(cred.properties.find((property) => property.name === 'accessTokenUrl')).toMatchObject({
			type: 'hidden',
			default: expect.stringContaining('/api/auth/oauth2/token'),
		});
		expect(
			cred.properties.find((property) => property.name === 'accessTokenUrl')?.default,
		).toContain('$self["baseUrl"]');
		expect((cred as unknown as { test?: unknown }).test).toBeUndefined();
		expect(new OpenAnalyticsApi().authenticate).toEqual({
			type: 'generic',
			properties: { headers: { Authorization: '=Bearer {{$credentials.apiKey}}' } },
		});
	});

	it('resolves both endpoint expressions with n8n Expression and per-credential $self values', () => {
		const expression = new Expression('UTC');
		const authUrl = cred.properties.find((property) => property.name === 'authUrl')
			?.default as string;
		const tokenUrl = cred.properties.find((property) => property.name === 'accessTokenUrl')
			?.default as string;
		for (const [baseUrl, expectedBase] of [
			['https://api.getopen.so', 'https://api.getopen.so'],
			['https://analytics.example/prefix/', 'https://analytics.example/prefix'],
		]) {
			const expressionData = { $self: { baseUrl } };
			expect(expression.resolveSimpleParameterValue(authUrl, expressionData as never)).toBe(
				`${expectedBase}/api/auth/oauth2/authorize`,
			);
			expect(expression.resolveSimpleParameterValue(tokenUrl, expressionData as never)).toBe(
				`${expectedBase}/api/auth/oauth2/token`,
			);
		}
	});

	it('selects credentials with n8n display rules and retains the API key for an old Revenue node', () => {
		const credentials = node.description.credentials ?? [];
		const apiKey = credentials.find((credential) => credential.name === 'openAnalyticsApi');
		const oauth = credentials.find((credential) => credential.name === 'openAnalyticsOAuth2Api');
		const visible = (parameters: Record<string, unknown>) =>
			credentials.filter((credential) =>
				NodeHelpers.displayParameter(
					parameters as never,
					credential,
					{ typeVersion: 1 },
					node.description,
				),
			);
		const oldWorkflowParameters = NodeHelpers.getNodeParameters(
			node.description.properties,
			{ resource: 'revenue' },
			true,
			false,
			{ typeVersion: 1 },
			node.description,
		)!;
		expect(oldWorkflowParameters.authentication).toBe('apiKey');

		expect(visible(oldWorkflowParameters).map((credential) => credential.name)).toEqual([
			'openAnalyticsApi',
		]);
		expect(visible({ resource: 'revenue', authentication: 'apiKey' })).toEqual([apiKey]);
		expect(visible({ resource: 'revenue', authentication: 'oauth2' })).toEqual([oauth]);
		expect(visible({ resource: 'analytics', authentication: 'oauth2' })).toEqual([oauth]);
	});

	it('leaves API-key request options and auth metadata unchanged with no site header', async () => {
		const request = structuredClone(baseRequest);
		const prepared = await prepareRevenueRequest.call(
			context({ authentication: 'apiKey' }),
			request,
		);
		expect(prepared).toEqual(baseRequest);
		expect(prepared.headers).not.toHaveProperty('X-OA-Site');
		expect(node.description.requestDefaults?.headers).toEqual({
			Accept: 'application/json',
			'Content-Type': 'application/json',
		});
	});

	it('passes existing API-key Analytics routing requests through unchanged without loading credentials', async () => {
		const operations = node.description.properties.find((property) => {
			const show = property.displayOptions?.show as { resource?: string[] } | undefined;
			return property.name === 'operation' && show?.resource?.includes('analytics');
		})?.options as Array<{ value: string; routing: { request: { url: string } } }>;
		expect(operations).toHaveLength(7);
		for (const operation of operations) {
			const request: IHttpRequestOptions = {
				url: operation.routing.request.url,
				qs: {
					from: '2026-09-01T00:00:00.000Z',
					to: '2026-09-30T23:59:59.999Z',
					timezone: 'UTC',
				},
				headers: { Authorization: 'Bearer api-key', Accept: 'application/json' },
			};
			const original = structuredClone(request);
			const credentialLookup = vi.fn(async () => ({}));
			const ctx = context({
				authentication: 'apiKey',
				resource: 'analytics',
				credentialLookup,
			});
			await expect(guardNonRevenueOAuth.call(ctx, request)).resolves.toBe(request);
			expect(request).toEqual(original);
			expect(request.headers).not.toHaveProperty('X-OA-Site');
			expect(credentialLookup).not.toHaveBeenCalled();
		}
	});

	it('validates OAuth2 context and adds only the selected site header', async () => {
		const request = structuredClone(baseRequest);
		const prepared = await prepareRevenueRequest.call(
			context({
				authentication: 'oauth2',
				siteId: sampleSiteId.toUpperCase(),
			}),
			request,
		);
		expect(prepared.headers).toMatchObject({
			Accept: 'application/json',
			'X-OA-Site': sampleSiteId,
		});
		expect(validateRevenueSiteId(` ${sampleSiteId.toUpperCase()} `)).toBe(sampleSiteId);
	});

	it('uses one OAuth credential with distinct per-node Site IDs without credential lookups', async () => {
		const credentialLookup = vi.fn(async () => {
			throw new Error('credential lookup should remain native');
		});
		const siteIds = [sampleSiteId, 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff'];
		const requests: IHttpRequestOptions[] = [];
		for (const siteId of siteIds) {
			const request = structuredClone(baseRequest);
			await prepareRevenueRequest.call(
				context({ authentication: 'oauth2', siteId, credentialLookup }),
				request,
			);
			requests.push(request);
		}
		expect(requests.map((request) => request.headers?.['X-OA-Site'])).toEqual(siteIds);
		expect(credentialLookup).not.toHaveBeenCalled();
	});

	it('rejects a missing or malformed OAuth2 Site ID before transport without echoing values', async () => {
		for (const siteId of ['', ' ', 'bad-sentinel']) {
			const request = structuredClone(baseRequest);
			await expect(
				prepareRevenueRequest.call(context({ authentication: 'oauth2', siteId }), request),
			).rejects.toThrow('Site ID containing a canonical UUID');
			expect(request.headers).not.toHaveProperty('X-OA-Site');
		}
	});

	it('rejects stale OAuth selection for Analytics or Site before sending', async () => {
		await expect(
			guardNonRevenueOAuth.call(
				context({ authentication: 'oauth2', resource: 'analytics' }),
				baseRequest,
			),
		).rejects.toThrow('OAuth2 is supported for Revenue only');
		await expect(
			guardNonRevenueOAuth.call(
				context({ authentication: 'apiKey', resource: 'analytics' }),
				baseRequest,
			),
		).resolves.toEqual(baseRequest);
		await expect(
			guardNonRevenueOAuth.call(
				context({ authentication: 'oauth2', resource: 'site' }),
				baseRequest,
			),
		).rejects.toThrow('OAuth2 is supported for Revenue only');
	});

	it('preserves an unknown API-key server success through one native routing-hook invocation', async () => {
		const output = [
			{ json: { totals: { net_minor: 1200, currency: 'EUR' } }, pairedItem: { item: 0 } },
		];
		const requestWithLegacyCurrency = {
			...baseRequest,
			qs: { currency: 'USD' },
		};
		const makeRoutingRequest = vi.fn(async () => output);
		const result = await revenueRequestBoundary.call(context({ request: makeRoutingRequest }), {
			options: requestWithLegacyCurrency,
			paginate: true,
		} as never);
		expect(makeRoutingRequest).toHaveBeenCalledTimes(1);
		expect(makeRoutingRequest).toHaveBeenCalledWith({
			options: requestWithLegacyCurrency,
			paginate: true,
		});
		expect(requestWithLegacyCurrency.qs).toEqual({ currency: 'USD' });
		expect((result as typeof output)[0].json.totals.currency).toBe('EUR');
		expect(result).toBe(output);
		expect(node.description.requestOperations?.pagination).toBeUndefined();
		const revenueOperations = node.description.properties.find((property) => {
			const show = property.displayOptions?.show as { resource?: string[] } | undefined;
			return property.name === 'operation' && show?.resource?.includes('revenue');
		})?.options as Array<{ value: string; routing?: Record<string, unknown> }>;
		expect(revenueOperations.map((operation) => operation.value)).toEqual([
			'getSummary',
			'getTimeseries',
		]);
		for (const operation of revenueOperations) {
			const send = operation.routing?.send as
				| { paginate?: boolean; preSend?: unknown[] }
				| undefined;
			expect(send?.paginate).toBe(true);
			expect(send?.preSend).toEqual([prepareRevenueRequest]);
			expect(
				(operation.routing?.operations as { pagination?: unknown } | undefined)?.pagination,
			).toBe(revenueRequestBoundary);
		}
		for (const resource of ['analytics', 'site']) {
			const property = node.description.properties.find((candidate) => {
				const show = candidate.displayOptions?.show as { resource?: string[] } | undefined;
				return candidate.name === 'operation' && show?.resource?.includes(resource);
			});
			const operations = property?.options as Array<{
				routing?: { operations?: { pagination?: unknown }; send?: { paginate?: boolean } };
			}>;
			expect(operations.length).toBeGreaterThan(0);
			for (const operation of operations) {
				expect(operation.routing?.operations?.pagination).toBeUndefined();
				expect(operation.routing?.send?.paginate).not.toBe(true);
			}
		}
	});

	it.each([
		[400, 'Check the date range, timezone'],
		[401, 'rejected the Revenue API key'],
		[403, 'Some Open Analytics releases require a registered OAuth2 client'],
	])('sanitizes API-key HTTP %i failures', async (status, message) => {
		const secret = 'secret-body-and-token-sentinel';
		const makeRoutingRequest = vi.fn(async () => {
			throw Object.assign(new Error(secret), { response: { status, data: { message: secret } } });
		});
		let thrown: unknown;
		try {
			await revenueRequestBoundary.call(context({ request: makeRoutingRequest }), {
				options: baseRequest,
			} as never);
		} catch (error) {
			thrown = error;
		}
		expect((thrown as Error).message).toContain(message);
		expect((thrown as Error).message).toContain(`HTTP ${status}`);
		expect((thrown as { description?: string }).description).toBe(`HTTP ${status}`);
		expect(JSON.stringify(thrown)).not.toContain(secret);
	});

	it('sanitizes OAuth2 owner/scope failures and refresh failures without leaking host errors', async () => {
		const secret = 'refresh-token-or-error-body-sentinel';
		for (const [status, expected] of [
			[403, 'owner role on the selected site'],
			[401, 'Reconnect the OAuth2 credential'],
			[400, 'if token refresh failed, reconnect the OAuth2 credential'],
		] as const) {
			const makeRoutingRequest = vi.fn(async () => {
				throw Object.assign(new Error(secret), { response: { status, data: { error: secret } } });
			});
			let thrown: unknown;
			try {
				await revenueRequestBoundary.call(
					context({ authentication: 'oauth2', request: makeRoutingRequest }),
					{ options: baseRequest } as never,
				);
			} catch (error) {
				thrown = error;
			}
			expect((thrown as Error).message).toContain(expected);
			expect((thrown as Error).message).toContain(`HTTP ${status}`);
			expect((thrown as { description?: string }).description).toBe(`HTTP ${status}`);
			expect(JSON.stringify(thrown)).not.toContain(secret);
			expect(makeRoutingRequest).toHaveBeenCalledTimes(1);
		}
	});

	it('sanitizes hostile status errors but preserves unrelated error identity', async () => {
		const secret = 'invalid-grant-body-refresh-token-sentinel';
		const malicious = Object.assign(
			new NodeOperationError(context().getNode(), `OAuth2 Revenue needs ${secret}`),
			{ response: { status: 400, data: secret }, cause: new Error(secret) },
		);
		const makeRoutingRequest = vi.fn(async () => {
			throw malicious;
		});
		let thrown: unknown;
		try {
			await revenueRequestBoundary.call(
				context({ authentication: 'oauth2', request: makeRoutingRequest }),
				{ options: baseRequest } as never,
			);
		} catch (error) {
			thrown = error;
		}
		expect((thrown as Error).message).toContain(
			'Open Analytics rejected the Revenue request or OAuth refresh',
		);
		expect((thrown as Error).message).toContain('HTTP 400');
		expect((thrown as { description?: string }).description).toBe('HTTP 400');
		expect(JSON.stringify(thrown)).not.toContain(secret);
		expect(JSON.stringify((thrown as Error).cause)).not.toContain(secret);
	});

	it('sanitizes Revenue network failures', async () => {
		const upstream = new Error('network sentinel');
		const makeRoutingRequest = vi.fn(async () => {
			throw upstream;
		});
		let sanitized: unknown;
		try {
			await revenueRequestBoundary.call(
				context({ resource: 'revenue', request: makeRoutingRequest }),
				{ options: baseRequest } as never,
			);
		} catch (error) {
			sanitized = error;
		}
		expect((sanitized as Error).message).toContain('Open Analytics Revenue request failed');
		expect((sanitized as { description?: string }).description).toBeUndefined();
		expect(JSON.stringify(sanitized)).not.toContain('network sentinel');
	});

	it('keeps currency and operation identifiers stable while correcting its claim', () => {
		const operation = node.description.properties.find(
			(property) =>
				property.name === 'operation' &&
				(property.displayOptions?.show as { resource?: string[] })?.resource?.includes('revenue'),
		)!;
		const options = operation.options as Array<{
			value: string;
			routing: { request: { url: string } };
		}>;
		expect(options.map((option) => [option.value, option.routing.request.url])).toEqual([
			['getSummary', '/v1/read/revenue/summary'],
			['getTimeseries', '/v1/read/revenue/timeseries'],
		]);
		const currency = node.description.properties
			.flatMap(
				(property) =>
					(property.options as
						| Array<{
								name: string;
								displayName?: string;
								description?: string;
								routing?: unknown;
						  }>
						| undefined) ?? [],
			)
			.filter((property) => property.name === 'currency');
		expect(currency).toHaveLength(2);
		expect(currency.every((property) => property.displayName === 'Legacy Currency')).toBe(true);
		for (const property of currency) {
			expect(
				(property.routing as { send?: { type?: string; property?: string } }).send,
			).toMatchObject({
				type: 'query',
				property: 'currency',
			});
			expect(property.description).toContain('source-reviewed release ignores it');
			expect(property.description).not.toContain('v0.8.0');
		}
		expect(JSON.stringify(operation)).not.toContain('v0.8.0');
	});
});
