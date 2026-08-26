import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

// Personal access token auth: n8n users create one at
// lowcodedevs.com/account/api-tokens. PATs carry full account access, so no
// scope handling is needed here.
export class LowCodeDevsApi implements ICredentialType {
	name = 'lowCodeDevsApi';

	displayName = 'LowCodeDevs API';

	documentationUrl = 'https://lowcodedevs.com/developers';

	properties: INodeProperties[] = [
		{
			displayName: 'Personal Access Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Create one under Account → API tokens on lowcodedevs.com',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://lowcodedevs.com',
			description: 'Only change this for staging',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/v1/me',
		},
	};
}
