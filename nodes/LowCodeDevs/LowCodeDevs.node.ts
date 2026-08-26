import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

// Regular node: read leads, create portfolio projects.
export class LowCodeDevs implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LowCodeDevs',
		name: 'lowCodeDevs',
		icon: 'file:lowcodedevs.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'LowCodeDevs marketplace: leads and portfolio projects',
		defaults: { name: 'LowCodeDevs' },
		inputs: ['main' as NodeConnectionType],
		outputs: ['main' as NodeConnectionType],
		credentials: [{ name: 'lowCodeDevsApi', required: true }],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				default: 'getLeads',
				options: [
					{ name: 'Get Open Leads', value: 'getLeads', action: 'Get open marketplace leads' },
					{ name: 'Get Claimed Leads', value: 'getClaimedLeads', action: 'Get your claimed leads' },
					{ name: 'Create Project', value: 'createProject', action: 'Create a portfolio project' },
					{ name: 'Get Me', value: 'getMe', action: 'Get the connected account' },
				],
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { operation: ['createProject'] } },
			},
			{
				displayName: 'Summary',
				name: 'summary',
				type: 'string',
				default: '',
				displayOptions: { show: { operation: ['createProject'] } },
			},
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				displayOptions: { show: { operation: ['createProject'] } },
			},
			{
				displayName: 'Tool Slugs',
				name: 'tools',
				type: 'string',
				default: '',
				description: 'Comma-separated tool slugs (as on lowcodedevs.com/tools), e.g. webflow,xano',
				displayOptions: { show: { operation: ['createProject'] } },
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const out: INodeExecutionData[] = [];
		const { baseUrl } = await this.getCredentials('lowCodeDevsApi');

		const call = async (options: { url: string; method?: 'GET' | 'POST'; body?: object }) =>
			this.helpers.httpRequestWithAuthentication.call(this, 'lowCodeDevsApi', {
				baseURL: baseUrl as string,
				json: true,
				...options,
			});

		for (let i = 0; i < items.length; i++) {
			const operation = this.getNodeParameter('operation', i) as string;
			switch (operation) {
				case 'getLeads': {
					const data = (await call({ url: '/api/v1/leads' })) as { leads: object[] };
					for (const lead of data.leads ?? []) out.push({ json: lead as never });
					break;
				}
				case 'getClaimedLeads': {
					const data = (await call({ url: '/api/v1/leads/claimed' })) as { leads: object[] };
					for (const lead of data.leads ?? []) out.push({ json: lead as never });
					break;
				}
				case 'createProject': {
					const tools = (this.getNodeParameter('tools', i) as string)
						.split(',')
						.map((s) => s.trim())
						.filter(Boolean);
					const created = await call({
						method: 'POST',
						url: '/api/v1/projects',
						body: {
							title: this.getNodeParameter('title', i) as string,
							summary: this.getNodeParameter('summary', i) as string,
							body: this.getNodeParameter('body', i) as string,
							tools,
						},
					});
					out.push({ json: created as never });
					break;
				}
				case 'getMe': {
					out.push({ json: (await call({ url: '/api/v1/me' })) as never });
					break;
				}
			}
		}
		return [out];
	}
}
