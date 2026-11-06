# GoodFaith real PayPal Sandbox runbook

This runbook is for the final verification pass. Never paste credentials into source, chat, screenshots, or the video.

## Configure the server

1. In the PayPal Developer Dashboard, create a Sandbox REST app.
2. Copy its Client ID and Secret into a local `.env` file based on `.env.example`.
3. Create a PayPal webhook for the deployed HTTPS URL plus `/api/webhooks/paypal` and record its webhook ID.
4. Keep `PAYPAL_ENVIRONMENT=sandbox` and leave `AI_MODE=demo` for the deterministic judge demo, or use `AI_MODE=ollama` only when the Ollama endpoint is reachable from the server.

Required variables:

```text
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...
PAYPAL_ENVIRONMENT=sandbox
```

## Verify the real order path

```powershell
npm install
npm run readiness
npm test
npm start
```

Open the portal, approve Maya’s fictional request, create the Sandbox order, complete buyer approval in the PayPal Sandbox account, return to GoodFaith, capture the order, and confirm fulfillment. Verify the UI shows distinct `order_created`, `captured`, and `fulfilled` states.

The server uses the PayPal Server SDK for order creation and capture. Webhooks are accepted only after PayPal transmission-signature verification succeeds. A missing or invalid signature must remain rejected.

## Release gate

Run `READINESS_STRICT=1 npm run readiness` only after the public repository remote, Sandbox credentials, webhook ID, hosted URL, and final walkthrough are ready. If it fails, do not submit.
