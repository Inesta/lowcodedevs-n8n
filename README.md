# n8n-nodes-lowcodedevs

n8n community nodes for [LowCodeDevs](https://lowcodedevs.com) — the low-code
ecosystem marketplace. Route new project leads into anything n8n reaches, and
automate your agency portfolio.

## Nodes

- **LowCodeDevs Trigger** — instant webhook trigger for:
  - `lead.available` — a new lead went live on the marketplace board
  - `lead.direct_received` — a client contacted your profile directly
  - `lead.claimed` — your agency claimed a lead
  Deliveries are HMAC-verified (`X-LCD-Signature`). Payloads never contain a
  client's contact details — the `url` field leads back to the app.
- **LowCodeDevs** — get open/claimed leads, create portfolio projects, get
  the connected account.

## Credentials

Create a personal access token at **lowcodedevs.com → Account → API tokens**
and paste it into the LowCodeDevs API credential.

## Development

```bash
npm install
npm run build
# link into a local n8n:
npm link && cd ~/.n8n/custom && npm link n8n-nodes-lowcodedevs
```

## Publishing checklist

- [ ] push to a public GitHub repo (`lowcodedevs/n8n-nodes-lowcodedevs`)
- [ ] `npm publish` (the `n8n-community-node-package` keyword makes it
      installable from the n8n UI)
- [ ] submit for n8n community node verification (listing on n8n.io/integrations)
