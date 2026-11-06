"""Build a transparent five-candidate comparison from recorded adapter evaluations."""
import argparse
import json
from pathlib import Path

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', default='training/reports/population-evaluation.json')
    args = parser.parse_args()
    candidates = [
        ('safety-first', 'training/artifacts/population-smoke/safety-first', 'training/reports/population-safety-first-eval.json'),
        ('empathetic', 'training/artifacts/population-smoke/empathetic', 'training/reports/population-empathetic-eval.json'),
        ('cart-planner', 'training/artifacts/population-smoke/cart-planner', 'training/reports/population-cart-planner-eval.json'),
        ('json-reliable', 'training/artifacts/population-smoke/json-reliable', 'training/reports/population-json-reliable-eval.json'),
        ('balanced', 'training/artifacts/population-smoke/balanced', 'training/reports/population-balanced-eval.json'),
    ]
    rows = []
    for name, artifact, report_path in candidates:
        report = json.loads(Path(report_path).read_text(encoding='utf-8'))
        rows.append({'name': name, 'artifact': artifact, 'report': report, 'promotion_status': 'not_promoted'})
    winner = max(rows, key=lambda row: row['report'].get('average_score', -1))
    for row in rows:
        if row is winner and row['report'].get('hard_safety_pass'):
            row['promotion_status'] = 'best_recorded_candidate_pending_full_holdout'
    payload = {'candidate_count': len(rows), 'winner': winner['name'], 'candidates': rows, 'method': 'recorded held-out/sample reports; no training metric is used as a safety gate'}
    path = Path(args.output)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding='utf-8')
    print(json.dumps({'candidate_count': len(rows), 'winner': winner['name'], 'output': str(path)}))

if __name__ == '__main__':
    main()
