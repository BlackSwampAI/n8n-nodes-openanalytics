import type { INodeProperties } from 'n8n-workflow';
import { prepareRevenueRequest, revenueRequestBoundary } from '../revenue-auth';

const showOnlyForRevenue = {
	resource: ['revenue'],
};

export const revenueDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForRevenue,
		},
		options: [
			{
				name: 'Get Summary',
				value: 'getSummary',
				action: 'Get revenue summary',
				description: 'Get revenue totals and optional preceding-period comparison',
				routing: {
					operations: { pagination: revenueRequestBoundary },
					send: { paginate: true, preSend: [prepareRevenueRequest] },
					request: {
						method: 'GET',
						url: '/v1/read/revenue/summary',
						qs: {
							from: '={{$parameter.from}}',
							to: '={{$parameter.to}}',
							timezone: '={{$parameter.timezone}}',
						},
					},
				},
			},
			{
				name: 'Get Timeseries',
				value: 'getTimeseries',
				action: 'Get revenue timeseries',
				description: 'Get revenue metrics over time at a specified resolution',
				routing: {
					operations: { pagination: revenueRequestBoundary },
					send: { paginate: true, preSend: [prepareRevenueRequest] },
					request: {
						method: 'GET',
						url: '/v1/read/revenue/timeseries',
						qs: {
							from: '={{$parameter.from}}',
							to: '={{$parameter.to}}',
							timezone: '={{$parameter.timezone}}',
						},
					},
				},
			},
		],
		default: 'getSummary',
	},
	{
		displayName: 'From',
		name: 'from',
		type: 'string',
		required: true,
		default: '={{new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()}}',
		displayOptions: {
			show: showOnlyForRevenue,
		},
		description: 'Start time as ISO-8601 UTC string (e.g. 2026-08-15T00:00:00.000Z)',
	},
	{
		displayName: 'To',
		name: 'to',
		type: 'string',
		required: true,
		default: '={{new Date().toISOString()}}',
		displayOptions: {
			show: showOnlyForRevenue,
		},
		description: 'End time as ISO-8601 UTC string (e.g. 2026-09-15T00:00:00.000Z)',
	},
	{
		displayName: 'Timezone',
		name: 'timezone',
		type: 'string',
		default: 'UTC',
		displayOptions: {
			show: showOnlyForRevenue,
		},
		description: 'IANA timezone name (e.g. UTC, America/New_York)',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				...showOnlyForRevenue,
				operation: ['getSummary'],
			},
		},
		options: [
			{
				displayName: 'Compare',
				name: 'compare',
				type: 'boolean',
				default: false,
				description: 'Whether to compare metrics with the preceding period',
				routing: {
					send: {
						type: 'query',
						property: 'compare',
					},
				},
			},
			{
				displayName: 'Legacy Currency',
				name: 'currency',
				type: 'string',
				default: '',
				description:
					'Legacy query parameter retained for saved workflows. The source-reviewed release ignores it and uses the site reporting currency; see compatibility documentation for version details.',
				routing: {
					send: {
						type: 'query',
						property: 'currency',
					},
				},
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				...showOnlyForRevenue,
				operation: ['getTimeseries'],
			},
		},
		options: [
			{
				displayName: 'Legacy Currency',
				name: 'currency',
				type: 'string',
				default: '',
				description:
					'Legacy query parameter retained for saved workflows. The source-reviewed release ignores it and uses the site reporting currency; see compatibility documentation for version details.',
				routing: {
					send: {
						type: 'query',
						property: 'currency',
					},
				},
			},
			{
				displayName: 'Resolution',
				name: 'resolution',
				type: 'options',
				options: [
					{
						name: 'Day',
						value: 'day',
					},
					{
						name: 'Hour',
						value: 'hour',
					},
				],
				default: 'day',
				description: 'Explicit time resolution (hour, day)',
				routing: {
					send: {
						type: 'query',
						property: 'resolution',
					},
				},
			},
		],
	},
];
