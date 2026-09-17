import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { analyticsDescription } from './resources/analytics';
import { revenueDescription } from './resources/revenue';
import { siteDescription } from './resources/site';

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
			...revenueDescription,
			...siteDescription,
		],
	};
}
