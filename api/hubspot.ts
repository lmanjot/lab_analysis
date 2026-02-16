import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const contactId = req.query.contactid as string | undefined
  if (!contactId) {
    return res.status(400).json({ error: 'Missing contactid parameter' })
  }

  const token = process.env.HUBSPOT_SECRET
  if (!token) {
    return res.status(500).json({ error: 'HUBSPOT_SECRET not configured' })
  }

  try {
    const url = `https://api.hubapi.com/crm/v3/objects/contacts/${encodeURIComponent(contactId)}?properties=blood_test_hl7,firstname,lastname,email`
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('HubSpot API error:', response.status, errorBody)
      return res.status(response.status).json({
        error: `HubSpot API error (${response.status})`,
      })
    }

    const data = await response.json()
    const hl7 = data?.properties?.blood_test_hl7 || ''
    const contactName = [
      data?.properties?.firstname || '',
      data?.properties?.lastname || '',
    ].filter(Boolean).join(' ')

    return res.status(200).json({
      hl7,
      contactName,
      contactId,
    })
  } catch (err) {
    console.error('HubSpot fetch error:', err)
    return res.status(500).json({ error: 'Failed to fetch from HubSpot' })
  }
}
