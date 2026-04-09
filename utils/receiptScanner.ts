import { GEMINI_API_KEY } from './config';

export interface ScannedReceipt {
  merchant: string;
  amount: number;
}

/**
 * Uses Gemini 1.5 Flash Vision to extract merchant and total amount from a receipt image.
 * 
 * @param base64Photo The base64 encoded image string
 * @returns { ScannedReceipt } Extracted information
 */
export async function scanReceipt(base64Photo: string): Promise<ScannedReceipt> {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing Gemini API Key. Please ensure EXPO_PUBLIC_GEMINI_API_KEY is set in your .env file.");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `
    Analyze this receipt image and extract the following data in JSON format:
    - merchant: The name of the store or restaurant. Be concise (e.g., 'Starbucks', not 'Starbucks Coffee #123').
    - amount: The total amount charged (the final number paid).

    Return ONLY the JSON. No markdown formatting, no preamble.
    Example: {"merchant": "Target", "amount": 42.50}
  `;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Photo,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to call Gemini API");
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      throw new Error("No text response from AI");
    }

    // Clean up potential markdown formatting if Gemini included it despite instructions
    const jsonString = textResponse.replace(/```json|```/g, "").trim();
    const result = JSON.parse(jsonString);

    if (!result.merchant || typeof result.amount !== 'number') {
      throw new Error("Could not extract valid data from the receipt.");
    }

    return result as ScannedReceipt;
  } catch (error) {
    console.error("Receipt Scan Error:", error);
    throw error;
  }
}
