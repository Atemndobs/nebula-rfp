
import { KeywordAnalysisResult, ProviderConfig } from '../types';

export const isOllamaAvailable = (config: ProviderConfig | undefined): boolean => {
  return !!config?.baseUrl;
};

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string; // This 'response' field should contain the JSON string we need
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export const analyzeTextWithOllama = async (
  text: string,
  targetKeywords: string[],
  corePromptTemplate: string,
  systemInstruction: string | undefined,
  ollamaConfig: ProviderConfig
): Promise<KeywordAnalysisResult> => {
  if (!ollamaConfig.baseUrl || !ollamaConfig.model) {
    console.error("Ollama base URL or model not configured.");
    return { foundKeywords: [], isMatch: false };
  }

  let fullPrompt = corePromptTemplate.replace("{{TEXT_TO_ANALYZE}}", text);
  fullPrompt = fullPrompt.replace("{{TARGET_KEYWORDS_LIST}}", targetKeywords.join(', '));

  if (systemInstruction) {
    fullPrompt = `${systemInstruction}\n\n${fullPrompt}`;
  }

  const endpoint = `${ollamaConfig.baseUrl.replace(/\/$/, '')}/api/generate`;

  try {
    const apiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ollamaConfig.model,
        prompt: fullPrompt,
        stream: false,
        format: "json", // Crucial for getting JSON output in the 'response' field
      }),
    });

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text();
      console.error(`Ollama API request failed with status ${apiResponse.status}: ${errorBody}`);
      throw new Error(`Ollama API error (${apiResponse.status}): ${errorBody || 'Failed to fetch from Ollama'}`);
    }

    const responseData = await apiResponse.json() as OllamaGenerateResponse;
    
    if (!responseData.response) {
        console.error("Ollama response did not contain a 'response' field:", responseData);
        return { foundKeywords: [], isMatch: false };
    }

    // The 'response' field itself should be the JSON string
    let jsonStr = responseData.response.trim();
    
    // In case the model still wraps it in markdown despite format: "json" (less likely but good to be safe)
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    const parsedResult = JSON.parse(jsonStr) as KeywordAnalysisResult;
    if (typeof parsedResult.isMatch === 'boolean' && Array.isArray(parsedResult.foundKeywords)) {
      return parsedResult;
    } else {
      console.error("Ollama response format unexpected after parsing inner JSON:", parsedResult);
      return { foundKeywords: [], isMatch: false };
    }

  } catch (error) {
    console.error("Error calling Ollama API or parsing response:", error);
    return { foundKeywords: [], isMatch: false };
  }
};

interface OllamaTagResponseModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[] | null;
    parameter_size: string;
    quantization_level: string;
  };
}
interface OllamaTagResponse {
  models: Array<OllamaTagResponseModel>;
}

export const fetchOllamaModels = async (baseUrl: string): Promise<string[]> => {
  if (!baseUrl) {
    console.error("Ollama base URL not provided for fetching models.");
    return [];
  }
  const endpoint = `${baseUrl.replace(/\/$/, '')}/api/tags`;
  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Failed to fetch Ollama models with status ${response.status}: ${errorBody}`);
      // Do not throw an error here if we want the AdminView to handle it gracefully and show the message
      return []; // Return empty array, error handled by caller
    }
    const data = await response.json() as OllamaTagResponse;
    if (data && Array.isArray(data.models)) {
      return data.models.map(model => model.name).sort();
    }
    console.error("Unexpected response structure for Ollama models:", data);
    return []; // Return empty array for unexpected structure
  } catch (error) {
    console.error("Error fetching Ollama models:", error);
    // Re-throw or return empty array, depending on how caller handles it.
    // For AdminView, returning [] and letting it set an error message is better.
    throw error; // Let AdminView catch this specific error
  }
};
