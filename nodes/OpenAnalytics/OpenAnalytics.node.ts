import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { analyticsDescription } from './resources/analytics';
import { revenueDescription } from './resources/revenue';
import { siteDescription } from './resources/site';
import { guardNonRevenueOAuth } from './revenue-auth';

export class OpenAnalytics implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Open Analytics',
		name: 'openAnalytics',
		icon: {
			light: 'file:../../icons/openanalytics.svg',
			dark: 'file:../../icons/openanalytics.dark.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Query web analytics data from Open Analytics',
		defaults: {
			name: 'Open Analytics',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'openAnalyticsApi',
				required: true,
				displayOptions: { show: { authentication: ['apiKey'] } },
			},
			{
				name: 'openAnalyticsOAuth2Api',
				required: true,
				displayOptions: { show: { authentication: ['oauth2'] } },
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials?.baseUrl || "https://api.getopen.so"}}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				noDataExpression: true,
				routing: { send: { preSend: [guardNonRevenueOAuth] } },
				options: [
					{
						name: 'API Key',
						value: 'apiKey',
						description: 'Use a site-bound API key; Revenue support depends on the server',
					},
					{
						name: 'OAuth2 (Revenue Only)',
						value: 'oauth2',
						description: 'Use OAuth2 for Revenue requests',
					},
				],
				default: 'apiKey',
				description:
					'OAuth2 is supported for Revenue requests only. Keep API Key selected for Analytics and Site.',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Analytics',
						value: 'analytics',
					},
					{
						name: 'Revenue',
						value: 'revenue',
					},
					{
						name: 'Site',
						value: 'site',
					},
				],
				default: 'analytics',
			},
			...analyticsDescription,
			{
				displayName: 'Site ID',
				name: 'siteId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['revenue'], authentication: ['oauth2'] } },
				description:
					'Canonical UUID of a site where your account has an owner membership. Open Analytics enforces current membership and revenue:read access.',
			},
			...revenueDescription,
			...siteDescription,
		],
	};
}
