# GoodFaith

GoodFaith is an AI-verified mutual-aid commerce prototype for the PayPal AI Hackathon. It helps a sponsor approve essential purchases while keeping the request, risk analysis, PayPal payment, and fulfillment trail transparent.

## Run locally

```bash
npm install
copy .env.example .env
npm start
```

Open http://localhost:3000. The full flow is: **Approve assistance → Create PayPal payment → buyer approval → capture → Confirm fulfillment**. For an offline test run without PayPal credentials, set `PAYPAL_OFFLINE_MODE=true`; production configuration refuses synthetic orders.

For a deployment-ready container, use `docker build -t goodfaith . && docker run --env-file .env -p 3000:3000 goodfaith`. `render.yaml` contains the corresponding Render service definition and keeps PayPal secrets out of source control. Health checks use `/api/health`.

The final live-Sandbox setup and release gate are documented in [`docs/REAL_SANDBOX_RUNBOOK.md`](docs/REAL_SANDBOX_RUNBOOK.md). Render deployment is documented in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

The concise pitch, demo sequence, criteria mapping, and verified-claims boundary are in [`SUBMISSION_PACKET.md`](SUBMISSION_PACKET.md).

GitHub Actions runs the offline smoke/security suite, checks all five portal routes, and validates the recorded model reports on every push and pull request. Those checks deliberately do not replace buyer-approved PayPal Sandbox verification.

## PayPal Sandbox

Add `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` from the PayPal Developer Dashboard to `.env`. Credentials are server-side only. With credentials present, `POST /api/paypal/order` uses the PayPal Server SDK to create an itemized Sandbox order and returns the approval URL; `POST /api/paypal/capture` captures the approved order. Without credentials, payment routes return a configuration error unless the explicit `PAYPAL_OFFLINE_MODE=true` test flag is enabled.

## Local AI

Ollama is supported through the `AI_MODE=ollama` setting. The default local model is `qwen2.5:1.5b`, but any compatible local chat model can be configured with `OLLAMA_MODEL`. GoodFaith sends the model a narrowly scoped policy prompt, validates its JSON response, and applies deterministic safety rules after the model. A model recommendation never has payment authority.

For a fully local AI service alongside the app, use `docker-compose.ollama.yml`. It keeps Ollama on the private Docker network and exposes only GoodFaith on port 3000. Supply the PayPal Sandbox variables at runtime; never commit them to `.env` or source control:

```powershell
$env:PAYPAL_CLIENT_ID='...'
$env:PAYPAL_CLIENT_SECRET='...'
$env:PAYPAL_WEBHOOK_ID='...'
docker compose -f docker-compose.ollama.yml up -d
docker exec goodfaith-ollama ollama pull qwen2.5:1.5b
```

The app then uses real PayPal Sandbox order/capture calls and the local Ollama model simultaneously. The deterministic policy layer remains authoritative for restricted requests and payment approval.

```powershell
$env:AI_MODE='ollama'
$env:OLLAMA_MODEL='qwen2.5:1.5b'
npm start
```

The reproducible overlay training and evaluation scaffold is in `training/`. It generates fictional cases, evaluates candidate predictions, and records the metrics needed to compare LoRA variants.

The current promoted application path remains deterministic-policy-first with optional Ollama enrichment. The QLoRA artifact is an experimental overlay candidate and must pass the held-out evaluator before being promoted; training loss alone is never treated as proof of safety or quality.

## Safety model

- No payment capture happens without an explicit sponsor approval event.
- AI output is treated as structured recommendation data, not payment authority.
- Webhook requests require a PayPal transmission signature header.
- No secrets belong in the repository; use `.env` locally and `.env.example` for documentation.
- The app always targets PayPal Sandbox; synthetic payment fixtures require the explicit `PAYPAL_OFFLINE_MODE=true` test flag.

## Hackathon fit

The project uses PayPal Sandbox and AI as core product capabilities, with a working interactive portal, public source, open-source license, a local Ollama integration, a reproducible overlay-training scaffold, and a focused end-to-end story for implementation, design, impact, innovation, and presentation.

## Judge-facing design decisions

The public Devpost panel includes PayPal developer advocates Jo Franchetti, Eddie Jaoude, and Marco Podien; PayPal engineering/product reviewers Karthik Ravi, Himraj Singh, and Nathaniel Olson; and partner reviewers from AG Grid, APIMatic, Bryntum, Channel3, Elastic, Postman, and Render. The panel can change under the official rules, so this is an optimization map—not a claim about private preferences.

- **PayPal engineers and product reviewers:** PayPal is a real transaction boundary, not a decorative button. Approval, payment, fulfillment, reset, and webhook states are explicit.
- **AI/ML and systems reviewers:** AI recommendations are structured, explainable, bounded by deterministic policy checks, and never granted payment authority.
- **Developer advocates and open-source reviewers:** the README has a one-command run path, safe environment setup, an explicit offline test mode, and a clear architecture story.
- **Product/design reviewers:** the hero screen shows one complete human story from need to relief, with no dead-end chat interface.
- **Partner-tool reviewers:** the architecture leaves clean integration boundaries for PayPal, Postman API testing, and optional AG Grid/Render/Channel3 extensions without making unsupported partner claims.

The submission narrative should show these five proof points in order: a real problem, AI reasoning, human control, PayPal transaction state, and measurable impact. This mirrors the official equally weighted criteria and the rules’ warning that judges may score from the description, screenshots, and video without running the app.
