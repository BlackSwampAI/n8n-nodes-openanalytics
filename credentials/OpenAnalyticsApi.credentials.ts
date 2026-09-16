import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class OpenAnalyticsApi implements ICredentialType {
	name = 'openAnalyticsApi';

	displayName = 'Open Analytics API';

	icon: Icon = {
		light: 'file:../icons/openanalytics.svg',
		dark: 'file:../icons/openanalytics.dark.svg',
	};

	documentationUrl = 'https://getopen.so/docs/api';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'API Bearer key created in Open Analytics dashboard settings.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			required: true,
			default: 'https://api.getopen.so',
			description:
				'The Open Analytics API base URL. Use default for cloud service or your self-hosted URL.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.baseUrl || "https://api.getopen.so"}}',
			url: '/v1/read/sites',
		},
	};
}
