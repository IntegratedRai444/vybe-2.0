"""
LangChain Integration
Provides agent framework and tool calling
"""
import os
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

try:
    from langchain.agents import AgentExecutor, create_react_agent
    from langchain.tools import Tool
    from langchain.memory import ConversationBufferMemory
    from langchain_community.llms import Ollama
    from langchain.prompts import PromptTemplate
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False
    logger.warning("LangChain not installed. Install with: pip install langchain langchain-community")

class LangChainClient:
    """LangChain agent for advanced AI interactions"""
    
    def __init__(self, model: str = "codellama:7b", base_url: str = "http://localhost:11434"):
        """Initialize LangChain client"""
        if not LANGCHAIN_AVAILABLE:
            raise ImportError("LangChain is not installed")
        
        self.model = model
        self.base_url = base_url
        self.llm = None
        self.agent = None
        self.memory = ConversationBufferMemory(memory_key="chat_history")
        
        self._initialize_llm()
        
    def _initialize_llm(self):
        """Initialize LLM"""
        try:
            self.llm = Ollama(
                model=self.model,
                base_url=self.base_url,
                temperature=0.7
            )
            logger.info(f"LangChain initialized with model: {self.model}")
        except Exception as e:
            logger.error(f"Failed to initialize LangChain LLM: {e}")
            raise
    
    def create_agent(self, tools: List[Tool]) -> AgentExecutor:
        """Create agent with tools"""
        if not self.llm:
            raise RuntimeError("LLM not initialized")
        
        # Create prompt template
        template = """Answer the following questions as best you can. You have access to the following tools:

{tools}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Begin!

Question: {input}
Thought: {agent_scratchpad}"""

        prompt = PromptTemplate.from_template(template)
        
        # Create agent
        agent = create_react_agent(self.llm, tools, prompt)
        
        # Create executor
        agent_executor = AgentExecutor(
            agent=agent,
            tools=tools,
            memory=self.memory,
            verbose=True,
            max_iterations=5,
            handle_parsing_errors=True
        )
        
        self.agent = agent_executor
        return agent_executor
    
    def run_agent(self, query: str, tools: Optional[List[Tool]] = None) -> str:
        """Run agent with query"""
        if not self.agent and tools:
            self.create_agent(tools)
        
        if not self.agent:
            raise RuntimeError("Agent not created. Provide tools first.")
        
        try:
            result = self.agent.invoke({"input": query})
            return result.get("output", "")
        except Exception as e:
            logger.error(f"Agent execution failed: {e}")
            return f"Error: {str(e)}"
    
    def chat(self, message: str) -> str:
        """Simple chat without tools"""
        if not self.llm:
            raise RuntimeError("LLM not initialized")
        
        try:
            response = self.llm.invoke(message)
            return response
        except Exception as e:
            logger.error(f"Chat failed: {e}")
            return f"Error: {str(e)}"
    
    def create_code_tools(self) -> List[Tool]:
        """Create default code-related tools"""
        tools = [
            Tool(
                name="CodeAnalyzer",
                func=self._analyze_code,
                description="Analyze code for issues, patterns, and improvements"
            ),
            Tool(
                name="CodeGenerator",
                func=self._generate_code,
                description="Generate code based on requirements"
            ),
            Tool(
                name="CodeExplainer",
                func=self._explain_code,
                description="Explain what code does"
            ),
        ]
        return tools
    
    def _analyze_code(self, code: str) -> str:
        """Analyze code"""
        prompt = f"Analyze this code and provide insights:\n\n{code}"
        return self.chat(prompt)
    
    def _generate_code(self, requirements: str) -> str:
        """Generate code"""
        prompt = f"Generate code for: {requirements}"
        return self.chat(prompt)
    
    def _explain_code(self, code: str) -> str:
        """Explain code"""
        prompt = f"Explain this code:\n\n{code}"
        return self.chat(prompt)
    
    def clear_memory(self):
        """Clear conversation memory"""
        self.memory.clear()

# Singleton instance
_langchain_client: Optional[LangChainClient] = None

def get_langchain_client(model: str = "codellama:7b") -> Optional[LangChainClient]:
    """Get or create LangChain client"""
    global _langchain_client
    
    if not LANGCHAIN_AVAILABLE:
        return None
    
    if _langchain_client is None:
        try:
            _langchain_client = LangChainClient(model=model)
        except Exception as e:
            logger.error(f"Failed to create LangChain client: {e}")
            return None
    
    return _langchain_client