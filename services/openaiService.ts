
import { KeywordAnalysisResult, ProviderConfig } from '../types';

export const isOpenAiAvailable = (config: ProviderConfig | undefined): boolean => {
  return !!config?.apiKey;
};

interface OpenAIChatChoice {
  index: number;
  message: {
    role: 'assistant';
    content: string; // This should be the JSON string
  };
  finish_reason: string;
}

interface OpenAIChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChatChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  system_fingerprint?: string;
}

export const analyzeTextWithOpenAI = async (
  text: string,
  targetKeywords: string[],
  corePromptTemplate: string,
  systemInstruction: string | undefined,
  openaiConfig: ProviderConfig
): Promise<KeywordAnalysisResult> => {
  if (!openaiConfig.apiKey || !openaiConfig.model) {
    console.error("OpenAI API key or model not configured.");
    return { foundKeywords: [], isMatch: false };
  }

  let populatedPrompt = corePromptTemplate.replace("{{TEXT_TO_ANALYZE}}", text);
  populatedPrompt = populatedPrompt.replace("{{TARGET_KEYWORDS_LIST}}", targetKeywords.join(', '));

  const messages: Array<{role: 'system' | 'user', content: string}> = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({ role: 'user', content: populatedPrompt });

  const endpoint = 'https://api.openai.com/v1/chat/completions';

  try {
    const apiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: openaiConfig.model,
        messages: messages,
        response_format: { type: "json_object" }, // Request JSON output
      }),
    });

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.json(); // OpenAI usually returns JSON errors
      console.error(`OpenAI API request failed with status ${apiResponse.status}:`, errorBody);
      const errorMessage = errorBody?.error?.message || `OpenAI API error (${apiResponse.status})`;
      throw new Error(errorMessage);
    }

    const responseData = await apiResponse.json() as OpenAIChatCompletionResponse;
    
    if (!responseData.choices || responseData.choices.length === 0 || !responseData.choices[0].message?.content) {
      console.error("OpenAI response did not contain expected content:", responseData);
      return { foundKeywords: [], isMatch: false };
    }

    const jsonStr = responseData.choices[0].message.content.trim();
    
    // No need to strip markdown fences as json_object mode should prevent them.
    const parsedResult = JSON.parse(jsonStr) as KeywordAnalysisResult;

    if (typeof parsedResult.isMatch === 'boolean' && Array.isArray(parsedResult.foundKeywords)) {
      return parsedResult;
    } else {
      console.error("OpenAI response format unexpected after parsing inner JSON:", parsedResult);
      return { foundKeywords: [], isMatch: false };
    }

  } catch (error) {
    console.error("Error calling OpenAI API or parsing response:", error);
    return { foundKeywords: [], isMatch: false };
  }
};
