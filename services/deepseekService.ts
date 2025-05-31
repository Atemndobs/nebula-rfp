
import { KeywordAnalysisResult, ProviderConfig } from '../types';

// Interface for the expected OpenAI-compatible chat completion response structure
interface DeepSeekChatChoice {
  index: number;
  message: {
    role: 'assistant';
    content: string; // This should be the JSON string
  };
  finish_reason: string;
}

interface DeepSeekChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: DeepSeekChatChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  system_fingerprint?: string;
}

export const isDeepSeekAvailable = (config: ProviderConfig | undefined): boolean => {
  return !!config?.apiKey;
};

export const analyzeTextWithDeepSeek = async (
  text: string,
  targetKeywords: string[],
  corePromptTemplate: string,
  systemInstruction: string | undefined,
  deepseekConfig: ProviderConfig
): Promise<KeywordAnalysisResult> => {
  if (!deepseekConfig.apiKey || !deepseekConfig.model) {
    console.error("DeepSeek API key or model not configured.");
    return { foundKeywords: [], isMatch: false };
  }

  let populatedPrompt = corePromptTemplate.replace("{{TEXT_TO_ANALYZE}}", text);
  populatedPrompt = populatedPrompt.replace("{{TARGET_KEYWORDS_LIST}}", targetKeywords.join(', '));

  const messages: Array<{role: 'system' | 'user', content: string}> = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({ role: 'user', content: populatedPrompt });

  const endpoint = 'https://api.deepseek.com/chat/completions';

  try {
    const apiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: deepseekConfig.model,
        messages: messages,
        // DeepSeek API supports response_format, similar to OpenAI
        response_format: { type: "json_object" }, 
        temperature: 0.2, // Good for JSON tasks
      }),
    });

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.json(); // DeepSeek usually returns JSON errors
      console.error(`DeepSeek API request failed with status ${apiResponse.status}:`, errorBody);
      const errorMessage = errorBody?.error?.message || `DeepSeek API error (${apiResponse.status})`;
      throw new Error(errorMessage);
    }

    const responseData = await apiResponse.json() as DeepSeekChatCompletionResponse;
    
    if (!responseData.choices || responseData.choices.length === 0 || !responseData.choices[0].message?.content) {
      console.error("DeepSeek response did not contain expected content:", responseData);
      return { foundKeywords: [], isMatch: false };
    }

    const jsonStr = responseData.choices[0].message.content.trim();
    
    const parsedResult = JSON.parse(jsonStr) as KeywordAnalysisResult;

    if (typeof parsedResult.isMatch === 'boolean' && Array.isArray(parsedResult.foundKeywords)) {
      return parsedResult;
    } else {
      console.error("DeepSeek response format unexpected after parsing inner JSON:", parsedResult);
      return { foundKeywords: [], isMatch: false };
    }

  } catch (error) {
    console.error("Error calling DeepSeek API or parsing response:", error);
    return { foundKeywords: [], isMatch: false };
  }
};
