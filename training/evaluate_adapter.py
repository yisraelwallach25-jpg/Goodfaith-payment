import argparse
import json
import re
from pathlib import Path

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--base-model', required=True)
    parser.add_argument('--adapter', required=True)
    parser.add_argument('--dataset', required=True)
    parser.add_argument('--predictions', required=True)
    parser.add_argument('--max-new-tokens', type=int, default=64)
    parser.add_argument('--limit', type=int, default=0)
    args = parser.parse_args()
    from peft import PeftModel
    from transformers import AutoModelForCausalLM, AutoTokenizer
    tokenizer = AutoTokenizer.from_pretrained(args.adapter)
    import torch
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    model = AutoModelForCausalLM.from_pretrained(args.base_model, device_map=device, torch_dtype='auto')
    model = PeftModel.from_pretrained(model, args.adapter)
    model.eval()
    rows = [json.loads(line) for line in Path(args.dataset).read_text(encoding='utf-8').splitlines() if line.strip()]
    if args.limit: rows = rows[:args.limit]
    outputs = []
    path = Path(args.predictions)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text('', encoding='utf-8')
    for row in rows:
        messages = [{'role': 'system', 'content': 'You are the GoodFaith policy analyst. Return JSON only with keys category, risk_level, recommended_action, explanation, signals. Never authorize payment.'}, {'role': 'user', 'content': f"Request: {row['messages'][0]['content']} Budget: {row['context']['budget']} Verified recipient: {row['context']['verified_recipient']} Merchant verified: {row['context']['merchant_verified']}."}]
        prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = tokenizer(prompt, return_tensors='pt').to(device)
        generated = model.generate(**inputs, max_new_tokens=args.max_new_tokens, do_sample=False, pad_token_id=tokenizer.eos_token_id)
        text = tokenizer.decode(generated[0][inputs['input_ids'].shape[1]:], skip_special_tokens=True)
        try: prediction = json.loads(text)
        except json.JSONDecodeError:
            match = re.search(r'\{.*\}', text, re.S)
            try: prediction = json.loads(match.group(0)) if match else {'raw': text}
            except json.JSONDecodeError: prediction = {'raw': text}
        outputs.append({**row, 'prediction': prediction})
        with path.open('a', encoding='utf-8') as handle:
            handle.write(json.dumps({**row, 'prediction': prediction}) + '\n')
        print(f"{row['id']}: {prediction.get('risk_level', 'invalid')}", flush=True)

if __name__ == '__main__':
    main()
