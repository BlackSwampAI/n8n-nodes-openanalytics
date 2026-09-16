import type { INodeProperties } from 'n8n-workflow';

const showOnlyForAnalytics = {
	resource: ['analytics'],
};

export const analyticsDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForAnalytics,
		},
		options: [
			{
				name: 'Get Devices',
				value: 'getDevices',
				action: 'Get devices breakdown',
				description: 'Get device types, browsers, and operating systems breakdown',
				routing: {
					request: {
						method: 'GET',
						url: '/v1/read/analytics/devices',
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
				name: 'Get Geography',
				value: 'getGeography',
				action: 'Get geography breakdown',
				description: 'Get countries and cities breakdown',
				routing: {
					request: {
						method: 'GET',
						url: '/v1/read/analytics/geography',
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
				name: 'Get Overview',
				value: 'getOverview',
				action: 'Get totals overview for range',
				description: 'Totals for the range: events, pageviews, visitors',
				routing: {
					request: {
						method: 'GET',
						url: '/v1/read/analytics/overview',
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
				name: 'Get Pages',
				value: 'getPages',
				action: 'Get page breakdown',
				description: 'Get top pages breakdown',
				routing: {
					request: {
						method: 'GET',
						url: '/v1/read/analytics/pages',
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
				name: 'Get Sessions',
				value: 'getSessions',
				action: 'Get sessions breakdown',
				description: 'Get bounce rate and visit duration breakdown',
				routing: {
					request: {
						method: 'GET',
						url: '/v1/read/analytics/sessions',
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
				name: 'Get Sources',
				value: 'getSources',
				action: 'Get sources breakdown',
				description: 'Get referrers and campaigns breakdown',
				routing: {
					request: {
						method: 'GET',
						url: '/v1/read/analytics/sources',
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
				action: 'Get timeseries chart data',
				description: 'The chart series data at an honest grain',
				routing: {
					request: {
						method: 'GET',
						url: '/v1/read/analytics/timeseries',
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
		default: 'getOverview',
	},
	{
		displayName: 'Site',
		name: 'siteId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: {
			show: showOnlyForAnalytics,
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
		default: '={{new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}}',
		displayOptions: {
			show: showOnlyForAnalytics,
		},
		description: 'Start time as ISO-8601 UTC string (e.g. 2026-09-01T00:00:00.000Z)',
	},
	{
		displayName: 'To',
		name: 'to',
		type: 'string',
		required: true,
		default: '={{new Date().toISOString()}}',
		displayOptions: {
			show: showOnlyForAnalytics,
		},
		description: 'End time as ISO-8601 UTC string (e.g. 2026-09-08T00:00:00.000Z)',
	},
	{
		displayName: 'Timezone',
		name: 'timezone',
		type: 'string',
		default: 'UTC',
		displayOptions: {
			show: showOnlyForAnalytics,
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
				...showOnlyForAnalytics,
				operation: ['getOverview'],
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
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				...showOnlyForAnalytics,
				operation: ['getTimeseries'],
			},
		},
		options: [
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
