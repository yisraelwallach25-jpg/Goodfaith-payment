# GoodFaith submission checklist

Official Devpost reminder received by Gmail: submissions close Thursday, November 12 at 12:00 PM PST. Keep the demo, test credentials, and trials active through the announced winner date of December 21.

| Requirement | Evidence | Status |
|---|---|---|
| PayPal technology is central | `server.js` PayPal Server SDK order/capture routes; `docs/REAL_SANDBOX_RUNBOOK.md` | Implemented; live Sandbox path requires buyer approval before capture |
| AI is meaningful | Ollama analysis path plus `training/` overlay pipeline | Ready; deterministic policy remains authoritative |
| Working prototype | `npm run smoke` and `/api/health` | Verified |
| Security and reliability tests | `npm test` (`smoke` + `security`) | Verified |
| Full portal | Overview, Requests, AI Chat, Impact, Settings pages | Verified locally |
| Public repository and license | `README.md`, `LICENSE`, `.gitignore`; GitHub `main` remote | Pushed to `https://github.com/yisraelwallach25-jpg/Goodfaith-payment` |
| Model evaluation | `training/reports/balanced-full-gpu-full-eval.json`, `population-evaluation.json` | Verified; no adapter promoted |
| Under-three-minute demo | `WALKTHROUGH.md`, `walkthrough.mp4` | Draft only; real browser capture required |
| Hosted demo | `Dockerfile`, `render.yaml` | Deployment-ready; hosted URL still required |
| Final Devpost submission | Devpost project form | Not submitted |

Do not submit while any row marked “still required” remains unresolved. Never include `.env`, PayPal secrets, or private recipient data in the repository or video.

Run `npm run readiness` before submission. Set `READINESS_STRICT=1` in CI or the release environment so missing credentials or a missing public remote fail the release gate.
