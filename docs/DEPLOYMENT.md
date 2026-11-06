# GoodFaith deployment

## Render

1. Create a Render Web Service from the public GitHub repository.
2. Use the Docker runtime and free plan. `render.yaml` contains the matching service definition and `/api/health` health check.
3. Add `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and `PAYPAL_WEBHOOK_ID` as runtime secrets. Never commit them.
4. Keep `PAYPAL_ENVIRONMENT=sandbox`, `AI_MODE=ollama`, and `OLLAMA_MODEL=goodfaith-analyst`.
5. Set `OLLAMA_URL` to a private Ollama service URL; do not expose Ollama publicly.
6. Verify `/api/health` reports `paymentMode: paypal-sandbox` before recording a demo.

Do not set `PAYPAL_OFFLINE_MODE=true` on the judge-facing deployment. That flag is reserved for local automated tests.

## Docker

```powershell
docker build -t goodfaith .
docker run --rm -p 3000:3000 -e PAYPAL_ENVIRONMENT=sandbox -e PAYPAL_CLIENT_ID=$env:PAYPAL_CLIENT_ID -e PAYPAL_CLIENT_SECRET=$env:PAYPAL_CLIENT_SECRET -e PAYPAL_WEBHOOK_ID=$env:PAYPAL_WEBHOOK_ID -e AI_MODE=ollama -e OLLAMA_URL=$env:OLLAMA_URL -e OLLAMA_MODEL=goodfaith-analyst goodfaith
```

The PayPal return URL and webhook listener must use the public HTTPS service URL. Complete buyer approval in Sandbox before capture; a redirect alone never authorizes capture.
