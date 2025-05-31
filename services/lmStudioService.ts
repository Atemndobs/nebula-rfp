
import { KeywordAnalysisResult, ProviderConfig } from '../types';

// Interface for the expected OpenAI-compatible chat completion response structure
// This is often what LM Studio emulates.
interface LMStudioChatChoice {
  index: number;
  message: {
    role: 'assistant';
    content: string; // This should be the JSON string
  };
  finish_reason: string;
}

interface LMStudioChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string; // The model name LM Studio used
  choices: LMStudioChatChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Interface for the expected response from /v1/models
interface LMStudioModel {
  id: string; // This usually contains the model name/ID
  object: string; // e.g., "model"
  created: number;
  owned_by: string;
}

interface LMStudioModelsResponse {
  object: string; // e.g., "list"
  data: LMStudioModel[];
}


export const isLmStudioAvailable = (config: ProviderConfig | undefined): boolean => {
  return !!config?.baseUrl;
};

export const analyzeTextWithLmStudio = async (
  text: string,
  targetKeywords: string[],
  corePromptTemplate: string,
  systemInstruction: string | undefined,
  lmStudioConfig: ProviderConfig
): Promise<KeywordAnalysisResult> => {
  if (!lmStudioConfig.baseUrl || !lmStudioConfig.model) {
    console.error("LM Studio base URL or model not configured.");
    return { foundKeywords: [], isMatch: false };
  }

  let populatedPrompt = corePromptTemplate.replace("{{TEXT_TO_ANALYZE}}", text);
  populatedPrompt = populatedPrompt.replace("{{TARGET_KEYWORDS_LIST}}", targetKeywords.join(', '));

  const messages: Array<{role: 'system' | 'user', content: string}> = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({ role: 'user', content: populatedPrompt });

  // LM Studio usually provides an OpenAI-compatible endpoint at /v1/chat/completions
  const endpoint = `${lmStudioConfig.baseUrl.replace(/\/$/, '')}/v1/chat/completions`;

  try {
    const apiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // LM Studio local server usually doesn't require an API key, but if yours does, it would be set here
        // 'Authorization': `Bearer ${lmStudioConfig.apiKey}`, 
      },
      body: JSON.stringify({
        model: lmStudioConfig.model, // LM Studio might ignore this if a model is already loaded, or use it if it can switch
        messages: messages,
        temperature: 0.2, // Lower temperature for more deterministic JSON output
        // Removed response_format: { type: "json_object" } due to server error
        stream: false,
      }),
    });

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text(); // LM Studio errors might be text or JSON
      console.error(`LM Studio API request failed with status ${apiResponse.status}: ${errorBody}`);
      let parsedErrorBody;
      try {
        parsedErrorBody = JSON.parse(errorBody);
      } catch (e) { /* ignore parsing error if not json */ }
      const errorMessage = parsedErrorBody?.error?.message || parsedErrorBody?.message || errorBody || `LM Studio API error (${apiResponse.status})`;
      throw new Error(errorMessage);
    }

    const responseData = await apiResponse.json() as LMStudioChatCompletionResponse;
    
    if (!responseData.choices || responseData.choices.length === 0 || !responseData.choices[0].message?.content) {
      console.error("LM Studio response did not contain expected content:", responseData);
      return { foundKeywords: [], isMatch: false };
    }

    let jsonStr = responseData.choices[0].message.content.trim();
    
    // If response_format: { type: "json_object" } is not honored, model might still wrap in markdown.
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    const parsedResult = JSON.parse(jsonStr) as KeywordAnalysisResult;

    if (typeof parsedResult.isMatch === 'boolean' && Array.isArray(parsedResult.foundKeywords)) {
      return parsedResult;
    } else {
      console.error("LM Studio response format unexpected after parsing inner JSON:", parsedResult);
      return { foundKeywords: [], isMatch: false };
    }

  } catch (error) {
    console.error("Error calling LM Studio API or parsing response:", error);
    return { foundKeywords: [], isMatch: false };
  }
};


export const fetchLmStudioModels = async (baseUrl: string): Promise<string[]> => {
  if (!baseUrl) {
    console.error("LM Studio base URL not provided for fetching models.");
    throw new Error("LM Studio base URL not provided.");
  }
  // Common OpenAI-compatible endpoint for listing models
  const endpoint = `${baseUrl.replace(/\/$/, '')}/v1/models`; 
  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      const errorBody = await response.text();
      let parsedErrorBody;
      try {
        parsedErrorBody = JSON.parse(errorBody);
      } catch(e) { /* not json */ }
      const errorMessage = parsedErrorBody?.error?.message || parsedErrorBody?.message || errorBody || `Failed to fetch LM Studio models (status ${response.status})`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
    const data = await response.json() as LMStudioModelsResponse;
    if (data && Array.isArray(data.data)) {
      // Extract model IDs, filter out any potential undefined/null IDs, and sort
      const modelIds = data.data
        .map(model => model.id)
        .filter(id => typeof id === 'string' && id.trim() !== '')
        .sort();
      if (modelIds.length === 0) {
        console.warn("LM Studio API returned an empty list of models or models with invalid IDs.");
        // No specific error message here, as an empty list is a valid (though perhaps unhelpful) response
      }
      return modelIds;
    }
    console.warn("Unexpected response structure for LM Studio models, or no models found:", data);
    // This implies an issue with the API response structure itself
    throw new Error("Unexpected response structure from LM Studio /v1/models endpoint.");
  } catch (error) {
    console.error("Error fetching LM Studio models:", error);
    if (error instanceof Error) {
        throw error; // Re-throw existing Error instances
    }
    throw new Error("An unknown error occurred while fetching LM Studio models."); // Wrap other throwables
  }
};
