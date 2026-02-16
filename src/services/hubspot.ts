export interface HubSpotContactData {
  hl7: string
  contactName: string
  contactId: string
  age: string
  sex: string
  medicalFormAnswers: Record<string, string>
}

export function getContactIdFromURL(): string | null {
  const params = new URLSearchParams(window.location.search)
  return params.get('contactid') || null
}

export async function fetchHL7FromHubSpot(contactId: string): Promise<HubSpotContactData> {
  const response = await fetch(`/api/hubspot?contactid=${encodeURIComponent(contactId)}`)

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data?.error || `HubSpot API error (${response.status})`)
  }

  return response.json()
}

/**
 * Format medical form answers into a readable string.
 * Converts HubSpot internal field names to readable labels with proper spacing.
 */
export function formatMedicalAnswers(answers: Record<string, string>): string {
  if (!answers || Object.keys(answers).length === 0) return ''

  return Object.entries(answers)
    .filter(([, value]) => value && value.trim())
    .map(([key, value]) => {
      // Convert HubSpot internal field names (snake_case) to readable labels
      const label = key
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim()

      // Clean up semicolon-separated values (HubSpot checkboxes)
      const cleanValue = value.includes(';')
        ? value.split(';').map((v) => v.trim()).filter(Boolean).join(', ')
        : value

      return `${label}: ${cleanValue}`
    })
    .join('\n')
}
