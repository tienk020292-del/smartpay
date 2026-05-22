import { ExtractedInfo } from "../types";

export async function extractPaymentInfo(base64Image: string, mimeType: string, fileName?: string): Promise<ExtractedInfo> {
  try {
    const response = await fetch("/api/ocr", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        base64Image,
        mimeType,
        fileName
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("OCR Service Error:", error);
    throw error;
  }
}
