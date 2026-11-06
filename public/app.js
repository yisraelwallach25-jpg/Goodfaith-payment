const $ = (s) => document.querySelector(s);
const toast = (message) => { const el = $('#toast'); el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 3000); };
const money = (value) => `$${Number(value).toFixed(2)}`;
function render(data) {
  $('#needText').textContent = data.request.need;
  $('#total').textContent = money(data.total);
  $('#cart').innerHTML = data.cart.map(item => `<div class="cart-item"><div><strong>${item.name}</strong><small>${item.merchant} · ${item.reason}</small></div><span class="price">${money(item.price)}</span></div>`).join('');
  $('#riskSummary').textContent = `GoodFaith AI says this request looks ${data.risk.level === 'low' ? 'safe' : 'needs review'}.`;
  $('#riskSignals').textContent = data.risk.signals.join(' · ');
  document.querySelector('.low-badge').textContent = data.risk.level === 'low' ? 'LOW RISK' : 'REVIEW';
  document.querySelector('.low-badge').style.background = data.risk.level === 'low' ? '#e3f7ec' : '#fff1d9';
  document.querySelector('.low-badge').style.color = data.risk.level === 'low' ? '#358159' : '#9b6a22';
  $('#timeline').innerHTML = data.timeline.map(step => `<div class="step ${step.state}"><div class="node">${step.state === 'done' ? '✓' : step.state === 'current' ? '•' : '·'}</div><div><strong>${step.label}</strong><small>${step.detail}</small></div><time>${step.time}</time></div>`).join('');
  const approve = $('#approveBtn');
  if (data.payment.status === 'ready') { approve.textContent = 'Approve assistance '; approve.innerHTML += '<span>→</span>'; }
  if (data.payment.status === 'approved') { approve.textContent = 'Create PayPal payment '; approve.innerHTML += '<span>→</span>'; }
  if (data.payment.status === 'order_created') { approve.textContent = 'Continue PayPal approval '; approve.innerHTML += '<span>↗</span>'; }
  if (data.payment.status === 'captured') { approve.textContent = 'Confirm fulfillment '; approve.innerHTML += '<span>→</span>'; }
  if (data.payment.status === 'fulfilled') { approve.textContent = 'Assistance complete ✓'; approve.disabled = true; }
}
async function api(path, options = {}) { const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15000); try { const r = await fetch(path, { headers: {'Content-Type':'application/json'}, ...options, signal: controller.signal }); const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Something went wrong'); return d; } catch (error) { if (error.name === 'AbortError') throw new Error('GoodFaith timed out waiting for the payment service. Check the Sandbox connection and try again.'); throw error; } finally { clearTimeout(timer); } }
async function refresh() { render(await api('/api/state')); }
$('#approveBtn').addEventListener('click', async () => { try { const current = await api('/api/state'); let data; if (current.payment.status === 'ready') { data = await api('/api/approve', {method:'POST'}); toast('Approved. GoodFaith is preparing the PayPal payment.'); } else if (current.payment.status === 'approved') { data = await api('/api/paypal/order', {method:'POST'}); if (data.approvalUrl) { window.location.assign(data.approvalUrl); return; } toast(data.demoNotice || 'Sandbox order created. Click again to capture the demo payment.'); } else if (current.payment.status === 'order_created') { if (current.payment.approvalUrl) { window.location.assign(current.payment.approvalUrl); return; } data = await api('/api/paypal/capture', {method:'POST'}); toast('Demo payment captured.'); } else if (current.payment.status === 'captured') { data = await api('/api/fulfill', {method:'POST'}); toast('Impact receipt created — help delivered.'); } if (data) render(data); } catch (e) { toast(e.message); } });
$('#resetBtn').addEventListener('click', async () => { render(await api('/api/reset', {method:'POST'})); toast('Demo reset to the Maya request.'); });
$('#detailsBtn').addEventListener('click', () => toast('AI analysis: verified recipient, matched essentials, 12/100 risk score, $0.00 over budget.'));
$('#receiptBtn').addEventListener('click', async () => { try { const response = await fetch('/api/receipts/latest'); if (!response.ok) { const data = await response.json(); throw new Error(data.error); } const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'goodfaith-receipt.html'; link.click(); URL.revokeObjectURL(url); toast('Receipt downloaded with AI reasoning and PayPal details.'); } catch (error) { toast(error.message); } });
refresh();
const params = new URLSearchParams(window.location.search);
if (params.get('paypal_return') === '1') {
  api('/api/paypal/capture', {method:'POST'}).then(data => { render(data); toast('PayPal Sandbox payment captured after buyer approval.'); }).catch(error => toast(`PayPal approval returned, but capture is pending: ${error.message}`));
}
