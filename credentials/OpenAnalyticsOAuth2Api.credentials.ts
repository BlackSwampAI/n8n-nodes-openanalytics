import type { ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

export class OpenAnalyticsOAuth2Api implements ICredentialType {
	name = 'openAnalyticsOAuth2Api';
	displayName = 'Open Analytics OAuth2 API';
	icon: Icon = {
		light: 'file:../icons/openanalytics.svg',
		dark: 'file:../icons/openanalytics.dark.svg',
	};
	documentationUrl = 'https://getopen.so/docs/api';
	extends = ['oAuth2Api'];

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'pkce',
		},
		{
			displayName: 'Use Dynamic Client Registration',
			name: 'useDynamicClientRegistration',
			type: 'hidden',
			default: false,
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			required: true,
			default:
				'={{(($self["baseUrl"] || "https://api.getopen.so").replace(/\\/+$/, "")) + "/api/auth/oauth2/authorize"}}',
			description:
				'OAuth authorization endpoint on the same Open Analytics installation as the API.',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			required: true,
			default:
				'={{(($self["baseUrl"] || "https://api.getopen.so").replace(/\\/+$/, "")) + "/api/auth/oauth2/token"}}',
			description: 'OAuth token endpoint on the same Open Analytics installation as the API.',
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			required: true,
			default: '',
			description: 'Client ID for a public OAuth client already registered with this installation.',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'hidden',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'site:read revenue:read offline_access',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			required: true,
			default: 'https://api.getopen.so',
			description:
				'API base URL for the same installation used by the authorization and token endpoints.',
		},
	];
}
