"""Train five small population candidates on the smoke split for reproducibility."""
import json, subprocess, sys
from pathlib import Path

VARIANTS = [
    ('safety-first', 8, 16, 0.00008, 1),
    ('empathetic', 16, 32, 0.00010, 1),
    ('cart-planner', 16, 32, 0.00012, 1),
    ('json-reliable', 32, 64, 0.00008, 1),
    ('balanced', 16, 32, 0.00010, 1),
]

def main():
    root = Path(__file__).resolve().parents[1]
    config_dir = root / 'training' / 'configs' / 'population-smoke'
    artifact_dir = root / 'training' / 'artifacts' / 'population-smoke'
    config_dir.mkdir(parents=True, exist_ok=True)
    artifact_dir.mkdir(parents=True, exist_ok=True)
    for name, rank, alpha, lr, epochs in VARIANTS:
        config = {'name': name, 'rank': rank, 'alpha': alpha, 'learning_rate': lr, 'epochs': epochs, 'dropout': 0.02, 'safety_weight': 1.5}
        config_path = config_dir / f'{name}.json'
        config_path.write_text(json.dumps(config), encoding='utf-8')
        output = artifact_dir / name
        subprocess.run([sys.executable, str(root / 'training' / 'train_overlay.py'), '--model', 'Qwen/Qwen2.5-0.5B-Instruct', '--dataset', str(root / 'training' / 'data' / 'smoke.jsonl'), '--variant', str(config_path), '--output', str(output), '--max-seq-length', '384'], cwd=root, check=True)
        print(json.dumps({'candidate': name, 'artifact': str(output)}), flush=True)

if __name__ == '__main__': main()
