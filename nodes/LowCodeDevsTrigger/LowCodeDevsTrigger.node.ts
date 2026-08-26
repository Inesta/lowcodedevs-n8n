import { createHmac } from 'crypto';
import type {
	IHookFunctions,
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	NodeConnectionType,
} from 'n8n-workflow';

// Instant trigger backed by /api/v1/webhooks. The subscription id + signing
// secret live in workflow static data; incoming deliveries are verified
// against the X-LCD-Signature HMAC before they reach the workflow.
export class LowCodeDevsTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LowCodeDevs Trigger',
		name: 'lowCodeDevsTrigger',
		icon: 'file:lowcodedevs.svg',
		group: ['trigger'],
		version: 1,
		description: 'Fires on new LowCodeDevs leads (marketplace, direct or claimed)',
		defaults: { name: 'LowCodeDevs Trigger' },
		inputs: [],
		outputs: ['main' as NodeConnectionType],
		credentials: [{ name: 'lowCodeDevsApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: ['lead.available'],
				options: [
					{
						name: 'Lead Available',
						value: 'lead.available',
						description: 'A new lead went live on the marketplace board',
					},
					{
						name: 'Direct Lead Received',
						value: 'lead.direct_received',
						description: 'A client contacted your profile directly',
					},
					{
						name: 'Lead Claimed',
						value: 'lead.claimed',
						description: 'Your agency claimed a lead (log it in your CRM)',
					},
				],
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const stored = this.getWorkflowStaticData('node');
				if (!stored.subscriptionId) return false;
				const { baseUrl } = await this.getCredentials('lowCodeDevsApi');
				const { webhooks } = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'lowCodeDevsApi',
					{ baseURL: baseUrl as string, url: '/api/v1/webhooks', json: true },
				)) as { webhooks: Array<{ id: number }> };
				return (webhooks ?? []).some((w) => w.id === stored.subscriptionId);
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const stored = this.getWorkflowStaticData('node');
				const { baseUrl } = await this.getCredentials('lowCodeDevsApi');
				const created = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'lowCodeDevsApi',
					{
						method: 'POST',
						baseURL: baseUrl as string,
						url: '/api/v1/webhooks',
						body: {
							url: this.getNodeWebhookUrl('default'),
							events: this.getNodeParameter('events') as string[],
						},
						json: true,
					},
				)) as { id: number; secret: string };
				stored.subscriptionId = created.id;
				stored.secret = created.secret;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const stored = this.getWorkflowStaticData('node');
				if (!stored.subscriptionId) return true;
				const { baseUrl } = await this.getCredentials('lowCodeDevsApi');
				try {
					await this.helpers.httpRequestWithAuthentication.call(this, 'lowCodeDevsApi', {
						method: 'DELETE',
						baseURL: baseUrl as string,
						url: `/api/v1/webhooks/${stored.subscriptionId}`,
					});
				} catch {
					// already gone server-side is fine
				}
				delete stored.subscriptionId;
				delete stored.secret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const stored = this.getWorkflowStaticData('node');
		const req = this.getRequestObject();
		const signature = this.getHeaderData()['x-lcd-signature'] as string | undefined;
		// verify over the raw bytes when the runtime kept them; a re-stringify
		// would not be byte-identical to what the sender signed
		const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
		const body = rawBody ? rawBody.toString('utf8') : JSON.stringify(this.getBodyData());
		if (stored.secret) {
			const expected = createHmac('sha256', stored.secret as string).update(body).digest('hex');
			if (signature !== expected) {
				// unauthenticated caller: acknowledge nothing, run nothing
				return { noWebhookResponse: false, workflowData: [] };
			}
		}
		return {
			workflowData: [this.helpers.returnJsonArray([this.getBodyData()])],
		};
	}
}
