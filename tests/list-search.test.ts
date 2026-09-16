import { describe, expect, it, vi } from 'vitest';
import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { getSites } from '../nodes/OpenAnalytics/listSearch/getSites';

function createMockContext(options?: {
	credentials?: Record<string, unknown>;
	credentialsError?: Error;
	responseData?: unknown;
	networkError?: Error;
}): ILoadOptionsFunctions {
	const { credentials, credentialsError, responseData, networkError } = options ?? {};

	return {
		getCredentials: vi.fn().mockImplementation(async () => {
			if (credentialsError) throw credentialsError;
			return credentials ?? { baseUrl: 'https://api.getopen.so' };
		}),
		helpers: {
			httpRequestWithAuthentication: vi.fn().mockImplementation(async () => {
				if (networkError) throw networkError;
				return responseData ?? [];
			}),
		},
	} as unknown as ILoadOptionsFunctions;
}

describe('getSites listSearch', () => {
	it('fetches sites and maps name, value, and description', async () => {
		const mockData = [
			{ id: 'site_1', name: 'My Website', slug: 'my-site', status: 'active', role: 'owner' },
			{ id: 'site_2', name: '', slug: 'docs-site', status: 'active', role: 'member' },
			{ id: 'site_3', name: '', slug: '', status: 'active', role: 'viewer' },
		];
		const context = createMockContext({ responseData: mockData });

		const result = await getSites.call(context);

		expect(context.getCredentials).toHaveBeenCalledWith('openAnalyticsApi');
		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith('openAnalyticsApi', {
			method: 'GET',
			url: 'https://api.getopen.so/v1/read/sites',
			json: true,
		});
		expect(result.results).toEqual([
			{
				name: 'My Website',
				value: 'site_1',
				description: 'slug: my-site',
			},
			{
				name: 'docs-site',
				value: 'site_2',
				description: 'slug: docs-site',
			},
			{
				name: 'site_3',
				value: 'site_3',
				description: undefined,
			},
		]);
	});

	it('respects custom baseUrl and strips trailing slash', async () => {
		const context = createMockContext({
			credentials: { baseUrl: 'https://analytics.example.com/' },
			responseData: [{ id: 'site_custom', name: 'Custom Instance' }],
		});

		const result = await getSites.call(context);

		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith('openAnalyticsApi', {
			method: 'GET',
			url: 'https://analytics.example.com/v1/read/sites',
			json: true,
		});
		expect(result.results).toHaveLength(1);
		expect(result.results[0].value).toBe('site_custom');
	});

	it('filters sites case-insensitively by name or value', async () => {
		const mockData = [
			{ id: 'site_abc', name: 'Frontend App', slug: 'frontend' },
			{ id: 'site_xyz', name: 'Backend Service', slug: 'backend' },
			{ id: 'site_123', name: 'API Gateway', slug: 'gateway' },
		];
		const context = createMockContext({ responseData: mockData });

		const filteredByName = await getSites.call(context, 'frontend');
		expect(filteredByName.results).toEqual([
			{ name: 'Frontend App', value: 'site_abc', description: 'slug: frontend' },
		]);

		const filteredByValue = await getSites.call(context, 'XYZ');
		expect(filteredByValue.results).toEqual([
			{ name: 'Backend Service', value: 'site_xyz', description: 'slug: backend' },
		]);

		const filterNonExistent = await getSites.call(context, 'not-found');
		expect(filterNonExistent.results).toEqual([]);
	});

	it('handles empty response or object-wrapper responses', async () => {
		const wrappedContext = createMockContext({
			responseData: {
				sites: [{ id: 'site_wrapped', name: 'Wrapped Site', slug: 'wrapped' }],
			},
		});
		const wrappedResult = await getSites.call(wrappedContext);
		expect(wrappedResult.results).toEqual([
			{ name: 'Wrapped Site', value: 'site_wrapped', description: 'slug: wrapped' },
		]);

		const emptyArrayContext = createMockContext({ responseData: [] });
		const emptyArrayResult = await getSites.call(emptyArrayContext);
		expect(emptyArrayResult.results).toEqual([]);

		const emptyWrapperContext = createMockContext({ responseData: { sites: [] } });
		const emptyWrapperResult = await getSites.call(emptyWrapperContext);
		expect(emptyWrapperResult.results).toEqual([]);

		const unexpectedContext = createMockContext({ responseData: {} });
		const unexpectedResult = await getSites.call(unexpectedContext);
		expect(unexpectedResult.results).toEqual([]);
	});

	it('handles credential or network failures gracefully', async () => {
		const networkErrorContext = createMockContext({
			networkError: new Error('ECONNREFUSED'),
		});
		const networkResult = await getSites.call(networkErrorContext);
		expect(networkResult.results).toEqual([]);

		const credentialsErrorContext = createMockContext({
			credentialsError: new Error('No credentials found'),
		});
		const credentialsResult = await getSites.call(credentialsErrorContext);
		expect(credentialsResult.results).toEqual([]);
	});
});
