"""
Fine-tuning script for Vybe AI OS models
"""
import os
import json
import argparse
from pathlib import Path
import requests
from typing import List, Dict, Optional
import time
from config import OLLAMA_HOST

class ModelFineTuner:
    def __init__(self, base_model: str = "llama2", host: str = OLLAMA_HOST):
        self.base_model = base_model
        self.host = host
        self.headers = {"Content-Type": "application/json"}
    
    def create_training_data(self, examples: List[Dict[str, str]]) -> str:
        """Convert examples to Ollama's training format"""
        training_data = []
        for ex in examples:
            training_data.append({
                "prompt": ex["prompt"],
                "completion": ex["completion"]
            })
        return json.dumps(training_data)
    
    def start_fine_tuning(self, training_data: List[Dict[str, str]], model_name: str, epochs: int = 3) -> bool:
        """Start fine-tuning process with Ollama"""
        try:
            # Create Modelfile content
            modelfile = f"""
            FROM {self.base_model}
            PARAMETER num_epoch {epochs}
            PARAMETER learning_rate 0.0001
            SYSTEM "You are a helpful coding assistant for Vybe AI OS"
            """
            
            # Save modelfile
            with open("Modelfile", "w") as f:
                f.write(modelfile)
            
            # Create and push the model
            create_cmd = f"ollama create {model_name} -f Modelfile"
            push_cmd = f"ollama push {model_name}"
            
            print(f"Creating model {model_name}...")
            os.system(create_cmd)
            
            print(f"Pushing model {model_name}...")
            os.system(push_cmd)
            
            return True
            
        except Exception as e:
            print(f"Error during fine-tuning: {str(e)}")
            return False

def load_training_data(file_path: str) -> List[Dict[str, str]]:
    """Load training data from JSONL file"""
    data = []
    with open(file_path, 'r') as f:
        for line in f:
            data.append(json.loads(line))
    return data

def main():
    parser = argparse.ArgumentParser(description="Fine-tune models for Vybe AI OS")
    parser.add_argument("--data", type=str, required=True, help="Path to training data JSONL file")
    parser.add_argument("--model", type=str, default="llama2", help="Base model to fine-tune")
    parser.add_argument("--name", type=str, required=True, help="Name for the fine-tuned model")
    parser.add_argument("--epochs", type=int, default=3, help="Number of training epochs")
    
    args = parser.parse_args()
    
    # Load training data
    print(f"Loading training data from {args.data}...")
    training_data = load_training_data(args.data)
    
    # Initialize fine-tuner
    tuner = ModelFineTuner(base_model=args.model)
    
    # Start fine-tuning
    print(f"Starting fine-tuning for model {args.name}...")
    success = tuner.start_fine_tuning(training_data, args.name, args.epochs)
    
    if success:
        print(f"\n✅ Fine-tuning completed successfully!")
        print(f"You can now use '{args.name}' in your Vybe AI OS configuration.")
    else:
        print("\n❌ Fine-tuning failed. Please check the error messages above.")

if __name__ == "__main__":
    main()
