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
							'x-oa-site': '={{$parameter.siteId}}',
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
		displayName: 'Site ID',
		name: 'siteId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				...showOnlyForSite,
				operation: ['get'],
			},
		},
		description: 'The site ID / tracking ID',
	},
];
