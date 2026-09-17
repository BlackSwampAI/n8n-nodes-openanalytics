import type { INodeProperties } from 'n8n-workflow';

const showOnlyForRealtime = {
	resource: ['realtime'],
};

export const realtimeDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForRealtime,
		},
		options: [
			{
				name: 'Get Token',
				value: 'getToken',
				action: 'Generate realtime stream token',
				description: 'Generate a short-lived token for realtime presence and live metric streaming',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/read/realtime/token',
						headers: {
							'x-oa-site': '={{$parameter.siteId?.value || $parameter.siteId}}',
						},
					},
				},
			},
		],
		default: 'getToken',
	},
	{
		displayName: 'Site',
		name: 'siteId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: {
			show: showOnlyForRealtime,
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
];
