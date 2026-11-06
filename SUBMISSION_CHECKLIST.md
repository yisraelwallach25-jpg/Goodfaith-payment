# GoodFaith submission checklist

| Requirement | Evidence | Status |
|---|---|---|
| PayPal technology is central | `server.js` PayPal Server SDK order/capture routes | Ready in demo mode; live Sandbox credentials still need verification |
| AI is meaningful | Ollama analysis path plus `training/` overlay pipeline | Ready; deterministic policy remains authoritative |
| Working prototype | `npm run smoke` and `/api/health` | Verified |
| Security and reliability tests | `npm test` (`smoke` + `security`) | Verified |
| Full portal | Overview, Requests, Impact, Settings pages | Verified locally |
| Public repository and license | `README.md`, `LICENSE`, `.gitignore` | Repository publication still required |
| Model evaluation | `training/reports/balanced-full-gpu-full-eval.json`, `population-evaluation.json` | Verified; no adapter promoted |
| Under-three-minute demo | `WALKTHROUGH.md`, `walkthrough.mp4` | Draft only; real browser capture required |
| Hosted demo | `Dockerfile`, `render.yaml` | Deployment-ready; hosted URL still required |
| Final Devpost submission | Devpost project form | Not submitted |

Do not submit while any row marked “still required” remains unresolved. Never include `.env`, PayPal secrets, or private recipient data in the repository or video.
