export interface HubSpotContactData {
  hl7: string
  contactName: string
  contactId: string
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
