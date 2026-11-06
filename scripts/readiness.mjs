import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const checks = [];
const add = (name, pass, detail) => checks.push({ name, pass, detail });
const present = name => Boolean(process.env[name] && process.env[name].trim());

add('source repository', fs.existsSync('.git'), fs.existsSync('.git') ? 'local Git history present' : 'initialize Git');
add('open-source license', fs.existsSync('LICENSE'), fs.existsSync('LICENSE') ? 'LICENSE present' : 'LICENSE missing');
add('deployment manifest', fs.existsSync('Dockerfile') && fs.existsSync('render.yaml'), 'Dockerfile and render.yaml are present');
const walkthroughNotes = fs.existsSync('WALKTHROUGH.md') ? fs.readFileSync('WALKTHROUGH.md', 'utf8') : '';
const walkthroughIsFinal = fs.existsSync('walkthrough.mp4') && !/not the final|draft only|final capture must/i.test(walkthroughNotes);
add('walkthrough artifact', walkthroughIsFinal, walkthroughIsFinal ? 'final walkthrough is present' : 'final browser walkthrough is still required');
const modelReports = ['training/reports/population-evaluation.json', 'training/reports/goodfaith-analyst-live-eval.json'];
const modelReportsValid = modelReports.every(file => {
  try { const report = JSON.parse(fs.readFileSync(file, 'utf8')); return typeof report === 'object' && report !== null; } catch { return false; }
});
add('model evaluation artifacts', modelReportsValid, modelReportsValid ? 'population and live analyst reports are present' : 'required model evaluation reports are missing or invalid');
add('PayPal client credentials', present('PAYPAL_CLIENT_ID') && present('PAYPAL_CLIENT_SECRET'), 'required for real Sandbox order/capture verification');
add('PayPal webhook identity', present('PAYPAL_WEBHOOK_ID'), 'required for live webhook verification');
add('public remote', (() => { try { return Boolean(execFileSync('git', ['config', '--get', 'remote.origin.url'], { encoding: 'utf8' }).trim()); } catch { return false; } })(), 'required before public repository submission');

const failed = checks.filter(item => !item.pass);
console.log(JSON.stringify({ ready: failed.length === 0, checks }, null, 2));
if (process.env.READINESS_STRICT === '1' && failed.length) process.exit(1);
