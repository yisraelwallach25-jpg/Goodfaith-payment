import 'dotenv/config';
import express from 'express';
import crypto from 'node:crypto';
import { Client, Environment, OrdersController } from '@paypal/paypal-server-sdk';

const app = express();
const port = Number(process.env.PORT || 3000);
const requestCounts = new Map();
const rateLimit = (windowMs = 60_000, max = 30) => (req, res, next) => {
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  const entry = requestCounts.get(key) || { started: now, count: 0 };
  if (now - entry.started > windowMs) { entry.started = now; entry.count = 0; }
  entry.count += 1;
  requestCounts.set(key, entry);
  if (entry.count > max) return res.status(429).json({ error: 'Too many requests. Please retry shortly.' });
  next();
};
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
app.use(express.json({ limit: '32kb', verify: (req, _res, buffer) => { req.rawBody = buffer.toString('utf8'); } }));
app.use(express.static('public'));

const seed = () => ({
  request: { id: 'GF-1042', recipient: 'Maya R.', need: 'A week of groceries and infant formula for my family of three', budget: 84.50, urgency: 'Today', verified: true },
  cart: [
    { id: 1, name: 'Family grocery bundle', merchant: 'Community Market', price: 42.00, reason: 'Covers staple meals for 7 days' },
    { id: 2, name: 'Infant formula, 22 oz', merchant: 'Community Market', price: 31.50, reason: 'Matches the requested infant age range' },
    { id: 3, name: 'Fresh produce add-on', merchant: 'Community Market', price: 11.00, reason: 'Stays within the sponsor budget' }
  ],
  risk: { level: 'low', score: 12, summary: 'This request is consistent, within budget, and uses a verified local merchant.', signals: ['Need and cart categories match', 'Total is $0.00 under the requested budget', 'Merchant is verified in the GoodFaith directory'] },
  payment: { status: 'ready', orderId: null, captureId: null },
  timeline: [
    { label: 'Request received', detail: 'AI parsed Maya’s need and constraints', state: 'done', time: '09:41' },
    { label: 'Cart verified', detail: 'Three essential items matched to the request', state: 'done', time: '09:42' },
    { label: 'Sponsor approval', detail: 'Waiting for a human decision', state: 'current', time: 'Now' },
    { label: 'PayPal payment', detail: 'Sandbox order will be captured after approval', state: 'pending', time: '—' },
    { label: 'Fulfillment check', detail: 'Recipient confirms the essentials arrived', state: 'pending', time: '—' }
  ]
});
let state = seed();

const total = () => state.cart.reduce((sum, item) => sum + item.price, 0).toFixed(2);
const aiMode = () => process.env.AI_MODE || 'demo';
const response = () => ({ ...state, total: total(), sandbox: true, aiMode: aiMode(), model: process.env.OLLAMA_MODEL || 'qwen2.5:1.5b' });

const paypalClient = () => {
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) return null;
  return new Client({
    environment: Environment.Sandbox,
    clientCredentialsAuthCredentials: {
      oAuthClientId: process.env.PAYPAL_CLIENT_ID,
      oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET
    }
  });
};

async function paypalAccessToken() {
  const credentials = `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`;
  const response = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(credentials).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  if (!response.ok) throw new Error(`PayPal OAuth returned ${response.status}`);
  return (await response.json()).access_token;
}

async function verifyPaypalWebhook(req) {
  if (!process.env.PAYPAL_WEBHOOK_ID || !process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) return false;
  const token = await paypalAccessToken();
  const payload = {
    auth_algo: req.headers['paypal-auth-algo'],
    cert_url: req.headers['paypal-cert-url'],
    transmission_id: req.headers['paypal-transmission-id'],
    transmission_sig: req.headers['paypal-transmission-sig'],
    transmission_time: req.headers['paypal-transmission-time'],
    webhook_id: process.env.PAYPAL_WEBHOOK_ID,
    webhook_event: JSON.parse(req.rawBody || '{}')
  };
  const response = await fetch('https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) return false;
  return (await response.json()).verification_status === 'SUCCESS';
}

const deterministicAnalysis = (text = '') => {
  const amount = Number(total());
  const lower = text.toLowerCase();
  const suspicious = ['gift card', 'weapon', 'cash transfer', 'bypass', 'ignore policy', 'ignore all previous', 'capture paypal', 'authorize payment'].some(term => lower.includes(term));
  if (suspicious) return { level: 'blocked', score: 96, summary: 'GoodFaith blocked this request because it conflicts with the assistance policy.', signals: ['Request contains a restricted or policy-bypass term', 'Sponsor review cannot override a blocked policy result'] };
  if (amount > state.request.budget || !state.request.verified) return { level: 'review', score: 64, summary: 'A sponsor should review the request before funds move.', signals: ['The cart or verification context needs additional review', 'GoodFaith has paused automatic payment preparation'] };
  return { level: 'low', score: 12, summary: 'The request is consistent, within budget, and uses a verified local merchant.', signals: ['Need and cart categories match', `Total is $${(state.request.budget - amount).toFixed(2)} under the requested budget`, 'Recipient identity is verified'] };
};

async function ollamaAnalysis(text) {
  const prompt = `You are GoodFaith's policy-aware mutual-aid commerce analyst. Return JSON only with keys level, score, summary, signals. The level must be low, review, or blocked. Never authorize payment. Request: ${text || state.request.need}. Budget: ${state.request.budget}. Cart total: ${total()}. Verified recipient: ${state.request.verified}.`;
  const r = await fetch(process.env.OLLAMA_URL || 'http://127.0.0.1:11434/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: process.env.OLLAMA_MODEL || 'qwen2.5:1.5b', stream: false, format: 'json', messages: [{ role: 'user', content: prompt }] }) });
  if (!r.ok) throw new Error(`Ollama returned ${r.status}`);
  const data = await r.json();
  const parsed = JSON.parse(data.message?.content || '{}');
  if (!['low', 'review', 'blocked'].includes(parsed.level) || !Array.isArray(parsed.signals)) throw new Error('Invalid GoodFaith analysis');
  return parsed;
}

app.get('/api/health', (_, res) => res.json({ ok: true, service: 'goodfaith', sandbox: true, aiMode: aiMode(), timestamp: new Date().toISOString() }));
app.get('/api/state', (_, res) => res.json(response()));
app.post('/api/reset', (_, res) => { state = seed(); res.json(response()); });

app.post('/api/analyze', rateLimit(60_000, 20), async (req, res) => {
  const text = String(req.body?.text || '').trim();
  if (text) state.request.need = text;
  try {
    const policyRisk = deterministicAnalysis(text);
    const modelRisk = aiMode() === 'ollama' ? await ollamaAnalysis(text) : policyRisk;
    // The model can add context, but deterministic policy always wins for hard safety rules.
    state.risk = policyRisk.level === 'blocked' ? policyRisk :
      policyRisk.level === 'review' && modelRisk.level === 'low' ? { ...modelRisk, level: 'review', score: Math.max(64, Number(modelRisk.score) || 64), summary: policyRisk.summary, signals: [...new Set([...policyRisk.signals, ...modelRisk.signals])] } : modelRisk;
    res.json(response());
  } catch (error) {
    state.risk = deterministicAnalysis(text);
    res.json({ ...response(), aiFallback: true, aiNotice: `Local model unavailable; deterministic policy fallback used (${error.message}).` });
  }
});

app.post('/api/approve', (_, res) => {
  if (state.risk.level === 'blocked') return res.status(409).json({ error: 'This request is blocked by policy.' });
  state.payment.status = 'approved';
  state.timeline[2] = { label: 'Sponsor approval', detail: 'Approved by demo sponsor', state: 'done', time: 'Now' };
  state.timeline[3] = { label: 'PayPal payment', detail: 'Ready to create a Sandbox order', state: 'current', time: 'Now' };
  res.json(response());
});

app.post('/api/paypal/order', rateLimit(60_000, 10), async (_, res) => {
  if (state.payment.status !== 'approved') return res.status(409).json({ error: 'Sponsor approval is required first.' });
  const client = paypalClient();
  if (!client) {
    state.payment.orderId = `DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    state.payment.status = 'order_created';
    state.timeline[3] = { label: 'PayPal payment', detail: 'Sandbox order created in demo mode; capture is the next explicit step', state: 'current', time: 'Now' };
    return res.json({ ...response(), demoNotice: 'Demo order created. Add PayPal Sandbox credentials for live order creation.' });
  }
  try {
    const orders = new OrdersController(client);
    const result = await orders.createOrder({
      body: {
        intent: 'CAPTURE',
        purchaseUnits: [{
          referenceId: state.request.id,
          description: 'GoodFaith verified mutual-aid assistance',
          amount: { currencyCode: 'USD', value: total(), breakdown: { itemTotal: { currencyCode: 'USD', value: total() } } },
          items: state.cart.map(item => ({ name: item.name, unitAmount: { currencyCode: 'USD', value: item.price.toFixed(2) }, quantity: '1', category: 'PHYSICAL_GOODS' }))
        }],
        applicationContext: { brandName: 'GoodFaith', userAction: 'PAY_NOW', shippingPreference: 'NO_SHIPPING' }
      },
      prefer: 'return=representation',
      paypalRequestId: `goodfaith-${state.request.id}-${Date.now()}`
    });
    const order = result.result;
    state.payment.orderId = order.id;
    state.payment.status = 'order_created';
    state.timeline[3] = { label: 'PayPal payment', detail: 'Sandbox order created; buyer approval required', state: 'current', time: 'Now' };
    return res.json({ ...response(), approvalUrl: order.links?.find(link => link.rel === 'approve')?.href || null });
  } catch (error) {
    return res.status(502).json({ error: 'PayPal Sandbox order creation failed.', detail: error.message });
  }
});

app.post('/api/paypal/capture', rateLimit(60_000, 10), async (req, res) => {
  if (!state.payment.orderId || state.payment.status !== 'order_created') return res.status(409).json({ error: 'A PayPal order awaiting buyer approval is required.' });
  const client = paypalClient();
  if (!client) {
    state.payment.captureId = `CAP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    state.payment.status = 'captured';
    state.timeline[3] = { label: 'PayPal payment', detail: 'Sandbox payment captured in demo mode', state: 'done', time: 'Now' };
    state.timeline[4] = { label: 'Fulfillment check', detail: 'Waiting for recipient confirmation', state: 'current', time: 'Now' };
    return res.json({ ...response(), demoNotice: 'Demo capture completed. Add PayPal Sandbox credentials for a live capture.' });
  }
  try {
    const orders = new OrdersController(client);
    const result = await orders.captureOrder({ id: state.payment.orderId, prefer: 'return=representation', paypalRequestId: `goodfaith-capture-${state.payment.orderId}` });
    const capture = result.result.purchaseUnits?.[0]?.payments?.captures?.[0];
    state.payment.captureId = capture?.id || null;
    state.payment.status = 'captured';
    state.timeline[3] = { label: 'PayPal payment', detail: 'Sandbox payment captured and reconciled', state: 'done', time: 'Now' };
    state.timeline[4] = { label: 'Fulfillment check', detail: 'Waiting for recipient confirmation', state: 'current', time: 'Now' };
    return res.json(response());
  } catch (error) {
    return res.status(502).json({ error: 'PayPal Sandbox capture failed.', detail: error.message });
  }
});

app.get('/api/paypal/return', (req, res) => {
  // PayPal redirects the buyer here after approval. Capture remains an explicit
  // sponsor/server action so a redirect can never move money by itself.
  res.redirect(`/?paypal_return=1&token=${encodeURIComponent(String(req.query.token || ''))}`);
});

app.post('/api/fulfill', (_, res) => {
  if (state.payment.status !== 'captured') return res.status(409).json({ error: 'Capture the payment first.' });
  state.payment.status = 'fulfilled';
  state.timeline[4] = { label: 'Fulfillment check', detail: 'Recipient confirmed the essentials arrived', state: 'done', time: 'Now' };
  res.json(response());
});

app.post('/api/webhooks/paypal', rateLimit(60_000, 60), (req, res) => {
  if (!req.headers['paypal-transmission-sig']) return res.status(400).json({ error: 'Missing PayPal signature' });
  verifyPaypalWebhook(req).then(valid => {
    if (!valid) return res.status(401).json({ error: 'PayPal webhook verification failed.' });
    return res.sendStatus(202);
  }).catch(() => res.status(401).json({ error: 'PayPal webhook verification failed.' }));
});

app.listen(port, () => console.log(`GoodFaith running at http://localhost:${port}`));
