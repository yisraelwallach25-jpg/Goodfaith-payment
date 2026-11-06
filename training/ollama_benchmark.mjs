import fs from 'node:fs/promises';

const datasetPath = process.argv[2] || 'training/data/smoke.jsonl';
const outputPath = process.argv[3] || 'training/reports/ollama-baseline.jsonl';
const model = process.env.OLLAMA_MODEL || 'qwen2.5:1.5b';
const lines = (await fs.readFile(datasetPath, 'utf8')).trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const output = [];
for (const row of lines) {
  const prompt = `You are the GoodFaith policy analyst. Return JSON only with keys category, risk_level, recommended_action, explanation, signals. Never authorize payment. Request: ${row.messages[0].content}. Budget: ${row.context.budget}. Verified recipient: ${row.context.verified_recipient}. Merchant verified: ${row.context.merchant_verified}.`;
  const response = await fetch(process.env.OLLAMA_URL || 'http://127.0.0.1:11434/api/chat', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({model, stream:false, format:'json', messages:[{role:'user', content:prompt}]}) });
  if (!response.ok) throw new Error(`Ollama request failed: ${response.status}`);
  const body = await response.json();
  let prediction;
  try { prediction = JSON.parse(body.message?.content || '{}'); } catch { prediction = {}; }
  output.push({...row, prediction});
  console.log(`${row.id}: ${prediction.risk_level || 'invalid'}`);
}
await fs.mkdir(new URL('./reports/', import.meta.url), {recursive:true}).catch(()=>{});
await fs.writeFile(outputPath, output.map(item => JSON.stringify(item)).join('\n') + '\n');
console.log(`Wrote ${output.length} predictions to ${outputPath}`);
