import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api/ai";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatCompletionOptions {
  provider?: string;
  model?: string;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  fileContent?: string;
  language?: string;
}

export const aiService = {
  async chatCompletion({
    provider = "ollama",
    model = "llama3:latest",
    messages,
    temperature = 0.7,
    maxTokens = 1000,
    fileContent,
    language = "typescript",
  }: ChatCompletionOptions) {
    try {
      // If file content is provided, prepend it to the messages
      const enhancedMessages = fileContent
        ? [
            {
              role: "system" as const,
              content: `You are a helpful coding assistant. The current file is written in ${language}. Here's the file content:\n\`\`\`${language}\n${fileContent}\n\`\`\``,
            },
            ...messages,
          ]
        : messages;

      const response = await axios.post(`${API_BASE_URL}/chat`, {
        provider,
        model,
        messages: enhancedMessages,
        temperature,
        max_tokens: maxTokens,
      });

      return response.data;
    } catch (error) {
      console.error("Error in AI chat completion:", error);
      throw error;
    }
  },

  async analyzeCode({
    code,
    language = "typescript",
    provider = "ollama",
    model = "codellama:7b-instruct",
  }: {
    code: string;
    language?: string;
    provider?: string;
    model?: string;
  }) {
    try {
      const response = await axios.post(`${API_BASE_URL}/chat`, {
        provider,
        model,
        messages: [
          {
            role: "system" as const,
            content: `You are a code analyzer. Analyze the following ${language} code for potential issues, performance improvements, and best practices. Provide a detailed report with code examples.`,
          },
          {
            role: "user" as const,
            content: `Analyze this ${language} code:\n\`\`\`${language}\n${code}\n\`\`\``,
          },
        ],
        temperature: 0.3, // Lower temperature for more focused analysis
      });

      return response.data;
    } catch (error) {
      console.error("Error in code analysis:", error);
      throw error;
    }
  },

  async getAvailableProviders() {
    try {
      const response = await axios.get(`${API_BASE_URL}/providers`);
      return response.data;
    } catch (error) {
      console.error("Error fetching AI providers:", error);
      return [];
    }
  },

  async configureProvider(provider: string, apiKey: string, baseUrl?: string) {
    try {
      const response = await axios.post(`${API_BASE_URL}/configure`, {
        provider,
        api_key: apiKey,
        base_url: baseUrl,
      });
      return response.data;
    } catch (error) {
      console.error(`Error configuring ${provider}:`, error);
      throw error;
    }
  },
};
