"""Train/evaluate GoodFaith LoRA candidates.

This script is intentionally explicit: it refuses to silently claim a trained
artifact when optional training dependencies or a base model are unavailable.
Use a small local instruct model for the first smoke run, then switch to a
3B/QLoRA model for the competition artifact.
"""
import argparse
import json
import os
from pathlib import Path

def load_jsonl(path):
    with open(path, encoding='utf-8') as handle:
        return [json.loads(line) for line in handle if line.strip()]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', default=os.getenv('BASE_MODEL', 'Qwen/Qwen2.5-0.5B-Instruct'))
    parser.add_argument('--dataset', default='training/data/goodfaith.jsonl')
    parser.add_argument('--variant', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--max-seq-length', type=int, default=768)
    args = parser.parse_args()
    try:
        from datasets import Dataset
        from transformers import AutoModelForCausalLM, AutoTokenizer
        from peft import LoraConfig
        from trl import SFTConfig, SFTTrainer
    except ImportError as exc:
        raise SystemExit(f'Missing training dependency: {exc}. Install training/requirements.txt first.')

    data = load_jsonl(args.dataset)
    rows = []
    system = 'You are the GoodFaith policy analyst. Return JSON only with keys category, risk_level, recommended_action, explanation, signals. Never authorize payment.'
    for item in data:
        prompt = item['messages'][0]['content']
        messages = [{'role': 'system', 'content': system}, {'role': 'user', 'content': prompt}, {'role': 'assistant', 'content': json.dumps(item['ideal'])}]
        rows.append({'text': messages})
    dataset = Dataset.from_list(rows)
    tokenizer = AutoTokenizer.from_pretrained(args.model, use_fast=True)
    if tokenizer.pad_token is None: tokenizer.pad_token = tokenizer.eos_token
    model = AutoModelForCausalLM.from_pretrained(args.model, device_map='auto', torch_dtype='auto')
    config = json.loads(Path(args.variant).read_text(encoding='utf-8'))
    lora = LoraConfig(r=config['rank'], lora_alpha=config['alpha'], lora_dropout=config['dropout'], bias='none', task_type='CAUSAL_LM', target_modules=['q_proj','k_proj','v_proj','o_proj'])
    training = SFTConfig(output_dir=args.output, num_train_epochs=config['epochs'], learning_rate=config['learning_rate'], per_device_train_batch_size=1, gradient_accumulation_steps=8, logging_steps=5, save_strategy='no', report_to='none', fp16=False, bf16=False, dataset_text_field='text', max_length=args.max_seq_length, gradient_checkpointing=False)
    def format_messages(row):
        return tokenizer.apply_chat_template(row['text'], tokenize=False, add_generation_prompt=False)
    trainer = SFTTrainer(model=model, processing_class=tokenizer, train_dataset=dataset, peft_config=lora, args=training, formatting_func=format_messages)
    trainer.train()
    trainer.save_model(args.output)
    tokenizer.save_pretrained(args.output)
    print(json.dumps({'model': args.model, 'variant': args.variant, 'output': args.output, 'examples': len(rows)}))

if __name__ == '__main__':
    main()
