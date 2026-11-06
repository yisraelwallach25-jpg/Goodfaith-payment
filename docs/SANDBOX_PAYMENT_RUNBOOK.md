# PayPal Sandbox payment runbook

GoodFaith uses PayPal Sandbox as the real payment boundary. The local Ollama model may explain risk, but it never authorizes or captures money.

## Expected state sequence

```text
ready -> approved -> order_created -> captured -> fulfilled
```

1. Open the Overview page and click **Approve assistance**.
2. Click **Create PayPal payment**. GoodFaith calls PayPal Sandbox and receives a real order ID plus an approval URL.
3. Click **Continue PayPal approval** and sign in with a Sandbox personal/buyer account.
4. Approve the order in PayPal. PayPal returns to `/api/paypal/return`; GoodFaith then captures the order.
5. Confirm fulfillment and download the receipt.

## What “slow” means

- Order creation normally returns in a few seconds.
- Capture is not attempted until the buyer approves the order.
- PayPal calls have a 15-second timeout. A timeout returns an explicit error instead of leaving the button spinning.
- If the page is stuck at `order_created`, finish the PayPal buyer approval or reset the request and create a fresh order.

## Checks

```powershell
Invoke-WebRequest -UseBasicParsing https://YOUR_HOST/api/health
Invoke-WebRequest -UseBasicParsing https://YOUR_HOST/api/state
```

After capture, the downloadable receipt is available at:

```text
https://YOUR_HOST/api/receipts/latest
```

The receipt includes the risk explanation, policy signals, cart, amount, PayPal order ID, capture ID, status, and Sandbox environment.
