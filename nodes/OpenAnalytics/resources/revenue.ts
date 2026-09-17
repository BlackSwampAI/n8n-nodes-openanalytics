import type { INodeProperties } from 'n8n-workflow';

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
				description: 'Get revenue totals, MRR, paying users, and conversion stats for a date range',
				routing: {
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
				displayName: 'Currency',
				name: 'currency',
				type: 'string',
				default: '',
				description: 'Filter or convert to a specific 3-letter currency code (e.g. USD, EUR)',
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
				displayName: 'Currency',
				name: 'currency',
				type: 'string',
				default: '',
				description: 'Filter or convert to a specific 3-letter currency code (e.g. USD, EUR)',
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
