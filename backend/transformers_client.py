"""
Transformers Integration
Local model inference using HuggingFace Transformers
"""
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

try:
    from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
    import torch
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    logger.warning("Transformers not installed. Install with: pip install transformers torch")

class TransformersClient:
    """Client for HuggingFace Transformers local inference"""
    
    def __init__(self, model_name: str = "Salesforce/codegen-350M-mono"):
        """Initialize Transformers client"""
        if not TRANSFORMERS_AVAILABLE:
            raise ImportError("Transformers is not installed")
        
        self.model_name = model_name
        self.tokenizer = None
        self.model = None
        self.pipeline = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        logger.info(f"Using device: {self.device}")
        
    def load_model(self, model_name: Optional[str] = None):
        """Load model and tokenizer"""
        if model_name:
            self.model_name = model_name
        
        try:
            logger.info(f"Loading model: {self.model_name}")
            
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_name,
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
                low_cpu_mem_usage=True
            )
            
            self.model.to(self.device)
            
            # Create pipeline
            self.pipeline = pipeline(
                "text-generation",
                model=self.model,
                tokenizer=self.tokenizer,
                device=0 if self.device == "cuda" else -1
            )
            
            logger.info(f"Model loaded successfully: {self.model_name}")
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
    
    def generate(
        self,
        prompt: str,
        max_length: int = 200,
        temperature: float = 0.7,
        top_p: float = 0.95,
        num_return_sequences: int = 1
    ) -> Optional[str]:
        """Generate text completion"""
        if not self.pipeline:
            logger.warning("Model not loaded. Loading default model...")
            self.load_model()
        
        try:
            outputs = self.pipeline(
                prompt,
                max_length=max_length,
                temperature=temperature,
                top_p=top_p,
                num_return_sequences=num_return_sequences,
                do_sample=True,
                pad_token_id=self.tokenizer.eos_token_id
            )
            
            if outputs:
                generated_text = outputs[0]["generated_text"]
                # Remove prompt from output
                completion = generated_text[len(prompt):].strip()
                return completion
                
        except Exception as e:
            logger.error(f"Generation failed: {e}")
        
        return None
    
    def complete_code(
        self,
        code_before: str,
        max_tokens: int = 100,
        temperature: float = 0.2
    ) -> Optional[str]:
        """Complete code"""
        return self.generate(
            code_before,
            max_length=len(code_before.split()) + max_tokens,
            temperature=temperature
        )
    
    def chat(
        self,
        message: str,
        max_tokens: int = 500,
        temperature: float = 0.7
    ) -> Optional[str]:
        """Simple chat (for instruction-tuned models)"""
        # Format as instruction if model supports it
        if "instruct" in self.model_name.lower() or "chat" in self.model_name.lower():
            prompt = f"### Instruction:\n{message}\n\n### Response:\n"
        else:
            prompt = message
        
        return self.generate(
            prompt,
            max_length=max_tokens,
            temperature=temperature
        )
    
    def unload_model(self):
        """Unload model to free memory"""
        if self.model:
            del self.model
            del self.tokenizer
            del self.pipeline
            
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            
            self.model = None
            self.tokenizer = None
            self.pipeline = None
            
            logger.info("Model unloaded")
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information"""
        return {
            "model_name": self.model_name,
            "device": self.device,
            "loaded": self.model is not None,
            "cuda_available": torch.cuda.is_available() if TRANSFORMERS_AVAILABLE else False
        }

# Singleton instance
_transformers_client: Optional[TransformersClient] = None

def get_transformers_client(model_name: str = "Salesforce/codegen-350M-mono") -> Optional[TransformersClient]:
    """Get or create Transformers client"""
    global _transformers_client
    
    if not TRANSFORMERS_AVAILABLE:
        return None
    
    if _transformers_client is None:
        try:
            _transformers_client = TransformersClient(model_name=model_name)
        except Exception as e:
            logger.error(f"Failed to create Transformers client: {e}")
            return None
    
    return _transformers_client