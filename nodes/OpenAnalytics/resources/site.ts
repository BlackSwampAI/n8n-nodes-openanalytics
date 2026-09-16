import type { INodeProperties } from 'n8n-workflow';

const showOnlyForSite = {
	resource: ['site'],
};

export const siteDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForSite,
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get site metadata',
				description: 'Get metadata for a specific site',
				routing: {
					request: {
						method: 'GET',
						url: '/v1/read/site',
						headers: {
							'x-oa-site': '={{$parameter.siteId?.value || $parameter.siteId}}',
						},
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many sites',
				description: 'Get many sites accessible with this credential',
				routing: {
					request: {
						method: 'GET',
						url: '/v1/read/sites',
					},
				},
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Site',
		name: 'siteId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: {
			show: {
				...showOnlyForSite,
				operation: ['get'],
			},
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
