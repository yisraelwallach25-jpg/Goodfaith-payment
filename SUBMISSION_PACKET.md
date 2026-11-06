# GoodFaith — judge-ready submission packet

## One-line pitch

GoodFaith turns a mutual-aid request into an explainable, human-approved PayPal payment with a visible evidence trail from need to fulfillment.

## The 90-second story

Sponsors want to help quickly, but opaque requests and payment workflows make trust expensive. GoodFaith parses a fictional recipient’s need, assembles a constrained cart, explains risk signals, and keeps the sponsor in control. PayPal is the transaction boundary; AI can recommend, but it cannot authorize or capture money.

## Demo sequence

1. Open Overview and show Maya’s request, cart, budget, verification, and risk signals.
2. Click Approve assistance. Explain that this is a human decision.
3. Create the PayPal order. Show the explicit `order_created` state.
4. Capture the Sandbox order after buyer approval, then confirm fulfillment.
5. Open Requests, Impact ledger, and Settings to show the portal beyond one screen.
6. Finish on the impact receipt and state the trust boundary: AI explains; humans approve; PayPal executes.

## Criteria mapping

- **Technological implementation:** PayPal Server SDK order/capture routes, webhook signature verification, Ollama enrichment, deterministic safety policy, and reproducible QLoRA training/evaluation.
- **Design:** A focused sponsor workspace with Overview, Requests, Impact ledger, and Settings pages; the main story is one coherent request journey.
- **Potential impact:** Mutual-aid sponsors, community funds, and relief organizations get faster review with an auditable assistance trail.
- **Innovation:** Treats payment as a governed evidence chain rather than an isolated checkout button; the model has no payment authority.
- **Presentation:** The demo is state-based and visual: need → analysis → approval → order → capture → fulfillment.

## Verified claims

- Local portal routes and API health endpoints return successfully.
- `npm test` passes smoke and security/reliability checks.
- Live local Ollama enrichment works; prompt injection is blocked before approval.
- Five QLoRA candidates were trained and evaluated.
- The balanced adapter’s 200-case held-out score is 54.5/100 with hard-safety pass true; it is not promoted.
- The explicit offline test mode mirrors the real PayPal state machine without claiming a live transaction; production configuration refuses synthetic orders when PayPal credentials are absent.
- The recorded five-candidate population evaluation selected `safety-first` on hard-safety criteria; the live `goodfaith-analyst` report covers 14 held-out cases, averages 58.57/100, and passes the hard-safety gate.

## Do not claim until verified

- Live PayPal Sandbox order/capture with configured credentials.
- Hosted demo URL.
- Final browser-recorded YouTube walkthrough.
