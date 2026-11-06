# GoodFaith overlay training

This directory contains the reproducible, synthetic-data training and evaluation scaffold for the GoodFaith domain overlay. It is intentionally separate from the payment server: model output recommends an action, while deterministic application policy and sponsor approval control money movement.

## Intended workflow

```text
python dataset_generator.py --out data/goodfaith.jsonl --train 1000 --valid 200 --test 200
python evaluate.py --predictions predictions.jsonl --report reports/eval.json
python train_overlay.py --variant configs/variant.json --output artifacts/candidate-1
python evolve.py --reports reports/candidate-1.json reports/candidate-2.json --next-config configs/next-generation.json
```

Install `requirements.txt` before training. `train_overlay.py` performs a reproducible PEFT/LoRA run; use a 4-bit quantized base and Unsloth acceleration when the local environment supports it. Train the five configurations in `configs/variants.json` sequentially, evaluate them on the hidden test set, then use `evolve.py` to mutate the best configuration for additional generations.

The generator writes the combined file plus `.train.jsonl`, `.valid.jsonl`, and `.test.jsonl` split files. The generated cases are fictional and designed around policy behavior: budget compliance, category matching, verification, restricted requests, duplicate requests, and prompt-injection resistance.

The local machine currently exposes a CPU-only PyTorch build, so the checked-in training entrypoint should be run as a small compatibility smoke test first. Do not present a smoke artifact as the competition model; record candidate metrics in `reports/` and only promote an adapter after it passes the hidden structured-output and safety benchmark.
