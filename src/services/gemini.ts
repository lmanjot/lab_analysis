import { GeminiReport } from '../types'

export async function analyzeWithGemini(
  accessToken: string,
  prompt: string,
  pdfBase64?: string
): Promise<GeminiReport> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, pdfBase64 }),
  })

  if (response.status === 401) {
    throw new Error('TOKEN_EXPIRED')
  }

  if (response.status === 403) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error((errorData as { message?: string })?.message || 'Access denied')
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const message = (errorData as { message?: string })?.message || (errorData as { error?: string })?.error || response.statusText
    throw new Error(`Analysis failed (${response.status}): ${message}`)
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const panels = Array.isArray(parsed.panels)
      ? parsed.panels.map((panel: any) => ({
          name: panel.name || '',
          biomarkers: Array.isArray(panel.biomarkers)
            ? panel.biomarkers.map((bio: any) => ({
                ...bio,
                hairStatus: bio.hairStatus || 'not_relevant',
              }))
            : [],
        }))
      : []
    return {
      medicalRecordAnalysis: parsed.medicalRecordAnalysis || '',
      generalHealth: parsed.generalHealth || '',
      hairSummary: parsed.hairSummary || '',
      etiologyAssessment: parsed.etiologyAssessment || '',
      regenerativeIndication: parsed.regenerativeIndication || '',
      panels,
      actionPlan: Array.isArray(parsed.actionPlan) ? parsed.actionPlan : [],
    }
  } catch {
    // If JSON parsing fails, create a fallback report from the raw text
    return {
      medicalRecordAnalysis: '',
      generalHealth: '',
      hairSummary: '',
      etiologyAssessment: text,
      regenerativeIndication: '',
      panels: [],
      actionPlan: [],
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
