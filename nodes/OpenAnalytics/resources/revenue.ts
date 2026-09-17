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
						headers: {
							'x-oa-site': '={{$parameter.siteId?.value || $parameter.siteId}}',
						},
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
				description: 'Get revenue metrics over time at a specified grain resolution',
				routing: {
					request: {
						method: 'GET',
						url: '/v1/read/revenue/timeseries',
						headers: {
							'x-oa-site': '={{$parameter.siteId?.value || $parameter.siteId}}',
						},
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
		displayName: 'Site',
		name: 'siteId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: {
			show: showOnlyForRevenue,
		},
		description: 'The site to query. Choose from the list, or specify an ID.',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a site...',
				typeOptions: {
					searchListMethod: 'getSites',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. site_12345',
			},
		],
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
				displayName: 'Grain',
				name: 'grain',
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
					{
						name: 'Month',
						value: 'month',
					},
					{
						name: 'Week',
						value: 'week',
					},
				],
				default: 'day',
				description: 'Explicit time grain resolution',
				routing: {
					send: {
						type: 'query',
						property: 'grain',
					},
				},
			},
		],
	},
];
