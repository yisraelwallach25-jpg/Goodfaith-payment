import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const checks = [];
const add = (name, pass, detail) => checks.push({ name, pass, detail });
const present = name => Boolean(process.env[name] && process.env[name].trim());

add('source repository', fs.existsSync('.git'), fs.existsSync('.git') ? 'local Git history present' : 'initialize Git');
add('open-source license', fs.existsSync('LICENSE'), fs.existsSync('LICENSE') ? 'LICENSE present' : 'LICENSE missing');
add('deployment manifest', fs.existsSync('Dockerfile') && fs.existsSync('render.yaml'), 'Dockerfile and render.yaml are present');
add('walkthrough artifact', fs.existsSync('walkthrough.mp4'), 'artifact exists; inspect WALKTHROUGH.md before submission');
add('PayPal client credentials', present('PAYPAL_CLIENT_ID') && present('PAYPAL_CLIENT_SECRET'), 'required for real Sandbox order/capture verification');
add('PayPal webhook identity', present('PAYPAL_WEBHOOK_ID'), 'required for live webhook verification');
add('public remote', (() => { try { return Boolean(execFileSync('git', ['config', '--get', 'remote.origin.url'], { encoding: 'utf8' }).trim()); } catch { return false; } })(), 'required before public repository submission');

const failed = checks.filter(item => !item.pass);
console.log(JSON.stringify({ ready: failed.length === 0, checks }, null, 2));
if (process.env.READINESS_STRICT === '1' && failed.length) process.exit(1);
