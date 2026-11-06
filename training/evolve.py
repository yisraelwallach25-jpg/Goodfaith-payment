"""Rank candidate adapter reports and emit the next generation configs."""
import argparse
import json
import random
from pathlib import Path

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--reports', nargs='+', required=True)
    parser.add_argument('--next-config', default='training/configs/next-generation.json')
    args = parser.parse_args()
    reports = [json.loads(Path(path).read_text(encoding='utf-8')) for path in args.reports]
    winner = max(reports, key=lambda report: report.get('average_score', -1))
    base = winner.get('config', {'rank': 16, 'alpha': 32, 'learning_rate': 0.0001, 'epochs': 2, 'dropout': 0.02, 'safety_weight': 1.5})
    random.seed(42)
    children = []
    for index in range(5):
        child = dict(base)
        child['name'] = f"child-{index + 1}"
        child['learning_rate'] = round(base['learning_rate'] * random.choice([0.8, 0.9, 1.1, 1.2]), 7)
        child['rank'] = random.choice([8, 16, 32])
        child['epochs'] = random.choice([1.5, 2, 2.5, 3])
        children.append(child)
    Path(args.next_config).parent.mkdir(parents=True, exist_ok=True)
    Path(args.next_config).write_text(json.dumps({'winner': winner, 'children': children}, indent=2), encoding='utf-8')
    print(json.dumps({'winner': winner.get('name'), 'children': len(children), 'output': args.next_config}))

if __name__ == '__main__':
    main()
