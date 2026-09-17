import { describe, expect, it } from 'vitest';
import { OpenAnalytics } from '../nodes/OpenAnalytics/OpenAnalytics.node';
import {
	assertRequiredControls,
	normalizeResourceLocator,
	requireNonBlankDefaults,
} from './helpers/operation-contract';

describe('OpenAnalytics node operation contracts', () => {
	const node = new OpenAnalytics();
	const description = node.description;

	it('configures credentials and request defaults for Open Analytics API', () => {
		expect(description.credentials).toEqual([{ name: 'openAnalyticsApi', required: true }]);
		expect(description.requestDefaults?.headers).toEqual({
			Accept: 'application/json',
			'Content-Type': 'application/json',
		});
		expect(description.requestDefaults?.baseURL).toContain('api.getopen.so');
	});

	it('configures methods.listSearch with getSites', () => {
		expect(node.methods?.listSearch?.getSites).toBeDefined();
		expect(typeof node.methods?.listSearch?.getSites).toBe('function');
	});

	it('configures siteId as a resourceLocator with getSites in site, analytics, and revenue resources', () => {
		const siteIdProperties = description.properties.filter(
			(property) => property.name === 'siteId',
		);
		expect(siteIdProperties).toHaveLength(3);

		for (const prop of siteIdProperties) {
			expect(prop.type).toBe('resourceLocator');
			expect(prop.default).toEqual({ mode: 'list', value: '' });
			expect(prop.required).toBe(true);
			expect(prop.modes).toBeDefined();

			const listMode = prop.modes?.find((m) => m.name === 'list');
			expect(listMode).toBeDefined();
			expect(listMode?.type).toBe('list');
			expect(listMode?.typeOptions?.searchListMethod).toBe('getSites');
			expect(listMode?.typeOptions?.searchable).toBe(true);

			const idMode = prop.modes?.find((m) => m.name === 'id');
			expect(idMode).toBeDefined();
			expect(idMode?.type).toBe('string');
		}
	});

	it('enforces required controls for site operations', () => {
		expect(() =>
			assertRequiredControls(description, {
				resource: 'site',
				operation: 'get',
				requiredControls: ['siteId'],
			}),
		).not.toThrow();

		expect(() =>
			assertRequiredControls(description, {
				resource: 'site',
				operation: 'getAll',
				requiredControls: [],
			}),
		).not.toThrow();
	});

	it('enforces required controls for all analytics operations', () => {
		const analyticsOperations = [
			'getOverview',
			'getTimeseries',
			'getPages',
			'getSources',
			'getGeography',
			'getDevices',
			'getSessions',
		];

		for (const operation of analyticsOperations) {
			expect(() =>
				assertRequiredControls(description, {
					resource: 'analytics',
					operation,
					requiredControls: ['siteId', 'from', 'to'],
				}),
			).not.toThrow();
		}
	});

	it('enforces required controls for revenue operations', () => {
		const revenueOperations = ['getSummary', 'getTimeseries'];

		for (const operation of revenueOperations) {
			expect(() =>
				assertRequiredControls(description, {
					resource: 'revenue',
					operation,
					requiredControls: ['siteId', 'from', 'to'],
				}),
			).not.toThrow();
		}
	});

	it('configures declarative routing on all site, analytics, and revenue operations', () => {
		const operationProperties = description.properties.filter(
			(property) => property.name === 'operation',
		);
		expect(operationProperties.length).toBeGreaterThanOrEqual(3);

		for (const prop of operationProperties) {
			const options = prop.options as Array<{
				name: string;
				value: string;
				routing?: { request?: { method?: string; url?: string } };
			}>;
			for (const opt of options) {
				expect(opt.routing?.request?.method).toBe('GET');
				expect(opt.routing?.request?.url).toMatch(/^\/v1\/read\//);
			}
		}
	});

	it('normalizes manual and list-mode resource locator values', () => {
		expect(normalizeResourceLocator(' manual-id ', 'Example')).toBe('manual-id');
		expect(normalizeResourceLocator({ mode: 'list', value: ' listed-id ' }, 'Example')).toBe(
			'listed-id',
		);
		expect(() => normalizeResourceLocator({ mode: 'list' }, 'Example')).toThrow(
			'Example must contain a non-empty list or manual value',
		);
	});

	it('demonstrates a test-contract preflight before a transport call', () => {
		let transportCalls = 0;
		const execute = () => {
			requireNonBlankDefaults({ name: '' }, ['name']);
			transportCalls += 1;
		};
		expect(execute).toThrow('name is required before transport');
		expect(transportCalls).toBe(0);
	});
});
