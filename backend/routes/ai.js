import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

// Initialize AI clients
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  : null;

export function setupAIRoutes(app) {
  // List available AI providers
  app.get("/providers", (req, res) => {
    const providers = [];

    if (openai) {
      providers.push({
        id: "openai",
        name: "OpenAI",
        models: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
        capabilities: ["chat", "completion", "code"],
      });
    }

    if (anthropic) {
      providers.push({
        id: "anthropic",
        name: "Anthropic",
        models: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
        capabilities: ["chat", "completion", "code"],
      });
    }

    // Always include mock provider for development
    providers.push({
      id: "mock",
      name: "Mock AI (Development)",
      models: ["mock-gpt", "mock-claude"],
      capabilities: ["chat", "completion", "code"],
    });

    res.json({ providers });
  });

  // Generate AI response
  app.post("/generate", async (req, res) => {
    try {
      const {
        prompt,
        model = "gpt-3.5-turbo",
        provider = "openai",
        file_path,
        context = {},
        temperature = 0.7,
        max_tokens = 2000,
      } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      let response;

      // Build context-aware prompt
      const contextualPrompt = buildContextualPrompt(
        prompt,
        file_path,
        context,
      );

      switch (provider) {
        case "openai":
          if (!openai) {
            throw new Error("OpenAI API key not configured");
          }
          response = await generateOpenAIResponse(
            contextualPrompt,
            model,
            temperature,
            max_tokens,
          );
          break;

        case "anthropic":
          if (!anthropic) {
            throw new Error("Anthropic API key not configured");
          }
          response = await generateAnthropicResponse(
            contextualPrompt,
            model,
            temperature,
            max_tokens,
          );
          break;

        case "mock":
        default:
          response = await generateMockResponse(contextualPrompt, file_path);
          break;
      }

      res.json({
        answer: response,
        model,
        provider,
        timestamp: new Date().toISOString(),
        context: {
          file_path,
          prompt_length: prompt.length,
          response_length: response.length,
        },
      });
    } catch (error) {
      console.error("AI generation error:", error);
      res.status(500).json({
        error: error.message,
        provider: req.body.provider || "unknown",
      });
    }
  });

  // Code completion endpoint
  app.post("/complete", async (req, res) => {
    try {
      const {
        code,
        language,
        position,
        model = "gpt-3.5-turbo",
        provider = "openai",
      } = req.body;

      if (!code || !language) {
        return res
          .status(400)
          .json({ error: "Code and language are required" });
      }

      const completionPrompt = buildCompletionPrompt(code, language, position);
      let suggestions;

      switch (provider) {
        case "openai":
          if (!openai) {
            throw new Error("OpenAI API key not configured");
          }
          suggestions = await generateCodeCompletion(completionPrompt, model);
          break;

        case "mock":
        default:
          suggestions = await generateMockCompletion(code, language, position);
          break;
      }

      res.json({
        suggestions,
        language,
        position,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Code completion error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Code explanation endpoint
  app.post("/explain", async (req, res) => {
    try {
      const {
        code,
        language,
        question,
        model = "gpt-3.5-turbo",
        provider = "openai",
      } = req.body;

      if (!code) {
        return res.status(400).json({ error: "Code is required" });
      }

      const explanationPrompt = buildExplanationPrompt(
        code,
        language,
        question,
      );
      let explanation;

      switch (provider) {
        case "openai":
          if (!openai) {
            throw new Error("OpenAI API key not configured");
          }
          explanation = await generateOpenAIResponse(explanationPrompt, model);
          break;

        case "anthropic":
          if (!anthropic) {
            throw new Error("Anthropic API key not configured");
          }
          explanation = await generateAnthropicResponse(
            explanationPrompt,
            model,
          );
          break;

        case "mock":
        default:
          explanation = await generateMockExplanation(code, language, question);
          break;
      }

      res.json({
        explanation,
        code_length: code.length,
        language,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Code explanation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Code review endpoint
  app.post("/review", async (req, res) => {
    try {
      const {
        code,
        language,
        focus = "general",
        model = "gpt-4",
        provider = "openai",
      } = req.body;

      if (!code) {
        return res.status(400).json({ error: "Code is required" });
      }

      const reviewPrompt = buildReviewPrompt(code, language, focus);
      let review;

      switch (provider) {
        case "openai":
          if (!openai) {
            throw new Error("OpenAI API key not configured");
          }
          review = await generateOpenAIResponse(reviewPrompt, model);
          break;

        case "anthropic":
          if (!anthropic) {
            throw new Error("Anthropic API key not configured");
          }
          review = await generateAnthropicResponse(reviewPrompt, model);
          break;

        case "mock":
        default:
          review = await generateMockReview(code, language, focus);
          break;
      }

      res.json({
        review,
        focus,
        language,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Code review error:", error);
      res.status(500).json({ error: error.message });
    }
  });
}

// Helper functions for AI providers

async function generateOpenAIResponse(
  prompt,
  model,
  temperature = 0.7,
  max_tokens = 2000,
) {
  const completion = await openai.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature,
    max_tokens,
  });

  return completion.choices[0].message.content;
}

async function generateAnthropicResponse(
  prompt,
  model,
  temperature = 0.7,
  max_tokens = 2000,
) {
  const response = await anthropic.messages.create({
    model,
    max_tokens,
    temperature,
    messages: [{ role: "user", content: prompt }],
  });

  return response.content[0].text;
}

async function generateMockResponse(prompt, file_path) {
  // Simulate AI processing delay
  await new Promise((resolve) =>
    setTimeout(resolve, 1000 + Math.random() * 2000),
  );

  const responses = [
    `I can help you with that! Based on your question about "${prompt.slice(
      0,
      50,
    )}...", here are some suggestions:

1. **Code Structure**: The code looks well-organized. Consider adding more comments for better readability.

2. **Best Practices**:
   - Use consistent naming conventions
   - Add error handling where appropriate
   - Consider breaking down large functions

3. **Performance**: The current implementation should work well for most use cases.

Would you like me to elaborate on any of these points?`,

    `Great question! Looking at your code, I notice a few things:

**Strengths:**
- Good use of modern JavaScript/TypeScript features
- Clean component structure
- Proper separation of concerns

**Suggestions for improvement:**
- Add TypeScript types if not already present
- Consider using React.memo for performance optimization
- Add unit tests for critical functions

**Security considerations:**
- Validate user inputs
- Sanitize data before rendering
- Use HTTPS for API calls

Let me know if you'd like specific examples for any of these!`,

    `I understand you're working on ${
      file_path ? `the file "${file_path}"` : "your code"
    }. Here's my analysis:

**Code Quality**: The structure looks solid. I'd recommend:
- Adding JSDoc comments for better documentation
- Using consistent error handling patterns
- Implementing proper logging

**Architecture**: Consider these patterns:
- Repository pattern for data access
- Observer pattern for state management
- Factory pattern for object creation

**Testing**: Don't forget to add:
- Unit tests for business logic
- Integration tests for API endpoints
- E2E tests for critical user flows

Would you like me to help you implement any of these suggestions?`,
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}

async function generateCodeCompletion(prompt, model) {
  if (!openai) {
    return generateMockCompletion();
  }

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content:
          "You are a code completion assistant. Provide only the code completion, no explanations.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 150,
  });

  return [completion.choices[0].message.content.trim()];
}

async function generateMockCompletion(code, language, position) {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const completions = {
    javascript: [
      ".map((item) => item.id)",
      ".filter((item) => item.active)",
      ".reduce((acc, item) => acc + item.value, 0)",
      "console.log()",
      "return null;",
      "useState()",
      "useEffect(() => {}, [])",
    ],
    typescript: [
      ": string",
      ": number",
      ": boolean",
      "interface Props {",
      "type Result = ",
      "async function",
      "Promise<void>",
    ],
    python: [
      "def __init__(self):",
      'if __name__ == "__main__":',
      "try:\n    pass\nexcept Exception as e:\n    print(e)",
      "import os",
      "from typing import List, Dict",
      "class MyClass:",
      "async def",
    ],
  };

  const suggestions = completions[language] || ["// TODO: Add implementation"];
  return suggestions.slice(0, 3);
}

async function generateMockExplanation(code, language, question) {
  await new Promise((resolve) => setTimeout(resolve, 800));

  return `## Code Explanation

This ${language || "code"} snippet ${
    question ? `(regarding "${question}")` : ""
  } does the following:

**Main functionality:**
- Defines the core logic for the component/function
- Handles data processing and state management
- Implements error handling and validation

**Key concepts:**
- Uses modern ${language} features and best practices
- Follows established design patterns
- Maintains clean, readable code structure

**How it works:**
1. First, it initializes the necessary variables and state
2. Then, it processes the input data according to the business logic
3. Finally, it returns or renders the appropriate result

**Potential improvements:**
- Add more comprehensive error handling
- Consider performance optimizations for large datasets
- Add unit tests to ensure reliability

Would you like me to explain any specific part in more detail?`;
}

async function generateMockReview(code, language, focus) {
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const reviews = {
    general: `## Code Review - General Assessment

**Overall Quality: Good** ⭐⭐⭐⭐

**Strengths:**
- Clean, readable code structure
- Good use of ${language} conventions
- Proper variable naming

**Areas for Improvement:**
- Add more inline comments for complex logic
- Consider extracting magic numbers into constants
- Add error handling for edge cases

**Security:** No major security concerns identified
**Performance:** Code should perform well under normal load
**Maintainability:** High - code is well-structured and easy to follow`,

    security: `## Security Review

**Security Rating: Medium** 🔒

**Potential Issues:**
- Input validation could be strengthened
- Consider sanitizing user-provided data
- Add rate limiting for API endpoints

**Recommendations:**
- Use parameterized queries to prevent SQL injection
- Implement proper authentication checks
- Add CSRF protection for forms
- Use HTTPS for all data transmission

**Good Practices Observed:**
- No hardcoded credentials found
- Proper error handling without information leakage`,

    performance: `## Performance Review

**Performance Rating: Good** ⚡

**Optimizations Identified:**
- Consider memoization for expensive calculations
- Implement lazy loading for large datasets
- Use efficient data structures (Map vs Object)

**Current Strengths:**
- Good algorithmic complexity
- Minimal unnecessary re-renders
- Efficient memory usage

**Recommendations:**
- Add performance monitoring
- Consider code splitting for large bundles
- Implement caching where appropriate`,
  };

  return reviews[focus] || reviews.general;
}

// Prompt building helpers

function buildContextualPrompt(prompt, file_path, context) {
  let contextualPrompt = prompt;

  if (file_path) {
    contextualPrompt = `Context: Working on file "${file_path}"\n\n${prompt}`;
  }

  if (context.selectedCode) {
    contextualPrompt += `\n\nSelected code:\n\`\`\`\n${context.selectedCode}\n\`\`\``;
  }

  if (context.projectType) {
    contextualPrompt = `Project type: ${context.projectType}\n\n${contextualPrompt}`;
  }

  return contextualPrompt;
}

function buildCompletionPrompt(code, language, position) {
  return `Complete the following ${language} code at the cursor position:

\`\`\`${language}
${code}
\`\`\`

Provide only the completion, no explanations.`;
}

function buildExplanationPrompt(code, language, question) {
  let prompt = `Explain the following ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``;

  if (question) {
    prompt += `\n\nSpecific question: ${question}`;
  }

  prompt +=
    "\n\nProvide a clear, detailed explanation that helps understand the code.";

  return prompt;
}

function buildReviewPrompt(code, language, focus) {
  return `Review the following ${language} code with focus on ${focus}:

\`\`\`${language}
${code}
\`\`\`

Provide a comprehensive review including:
- Code quality assessment
- Potential issues or bugs
- Suggestions for improvement
- Best practices recommendations

Focus specifically on: ${focus}`;
}
