import { GeminiReport } from '../types'
import { getGoogleProjectId, getGoogleLocation } from './auth'

const MODEL = 'gemini-2.0-flash'

function getEndpointUrl(): string {
  const projectId = getGoogleProjectId()
  const location = getGoogleLocation()

  if (!projectId) {
    throw new Error(
      'Google Cloud Project ID is not configured. Set goprojectid in Vercel, or VITE_GOOGLE_PROJECT_ID in .env'
    )
  }

  // Vertex AI endpoint supports OAuth (generativelanguage.googleapis.com does not)
  return `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${MODEL}`
}

interface GeminiPart {
  text?: string
  inlineData?: {
    mimeType: string
    data: string
  }
}

interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

interface GeminiRequest {
  contents: GeminiContent[]
  generationConfig?: {
    temperature?: number
    maxOutputTokens?: number
  }
}

export async function analyzeWithGemini(
  accessToken: string,
  prompt: string,
  pdfBase64?: string
): Promise<GeminiReport> {
  const parts: GeminiPart[] = []

  if (pdfBase64) {
    parts.push({
      inlineData: {
        mimeType: 'application/pdf',
        data: pdfBase64,
      },
    })
  }

  parts.push({ text: prompt })

  const requestBody: GeminiRequest = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 8192,
    },
  }

  const endpointUrl = getEndpointUrl()

  const response = await fetch(`${endpointUrl}:generateContent`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (response.status === 401) {
    throw new Error('TOKEN_EXPIRED')
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      `Gemini API error (${response.status}): ${errorData?.error?.message || response.statusText}`
    )
  }

  const data = await response.json()

  const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!textContent) {
    throw new Error('No response content from Gemini')
  }

  return parseGeminiResponse(textContent)
}

function parseGeminiResponse(text: string): GeminiReport {
  // Strip markdown code fences if present
  let cleaned = text.trim()
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7)
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3)
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3)
  }
  cleaned = cleaned.trim()

  try {
    const parsed = JSON.parse(cleaned)
    return {
      summary: parsed.summary || '',
      panels: Array.isArray(parsed.panels) ? parsed.panels : [],
      interpretation: parsed.interpretation || '',
      followUp: Array.isArray(parsed.followUp) ? parsed.followUp : [],
    }
  } catch {
    // If JSON parsing fails, create a fallback report from the raw text
    return {
      summary: 'The AI analysis was completed but the response could not be structured automatically.',
      panels: [],
      interpretation: text,
      followUp: [],
    }
  }
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove the data:application/pdf;base64, prefix
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
