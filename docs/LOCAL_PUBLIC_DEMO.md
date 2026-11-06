# Local public demo (Docker + Cloudflare Quick Tunnel)

This is a temporary public HTTPS route for the GoodFaith Sandbox demo. The Docker container and tunnel process must remain running.

## Start GoodFaith

```powershell
docker build -t goodfaith:demo .
docker rm -f goodfaith-demo 2>$null
docker run -d --name goodfaith-demo -p 3000:3000 --restart unless-stopped goodfaith:demo
Invoke-WebRequest -UseBasicParsing http://localhost:3000/api/health
```

## Start the public tunnel

```powershell
cloudflared tunnel --url http://localhost:3000
```

Copy the generated `https://*.trycloudflare.com` hostname. The PayPal webhook endpoint is:

```text
https://YOUR_TUNNEL_HOST.trycloudflare.com/api/webhooks/paypal
```

The current tunnel is temporary and changes when restarted. PayPal webhook verification still requires `PAYPAL_WEBHOOK_ID` and valid Sandbox credentials in the container environment; never commit those values.

## Verify public reachability

```powershell
Invoke-WebRequest -UseBasicParsing https://YOUR_TUNNEL_HOST.trycloudflare.com/api/health
```

Expected response includes `"ok":true` and `"sandbox":true`.
