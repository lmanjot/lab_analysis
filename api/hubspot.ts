import type { VercelRequest, VercelResponse } from '@vercel/node'

interface FormSubmissionValue {
  name: string
  value: string
  objectTypeId?: string
}

interface FormSubmission {
  submittedAt: number
  values: FormSubmissionValue[]
}

interface FormSubmissionsResponse {
  results: FormSubmission[]
  paging?: { next?: { after: string } }
}

function calculateAge(birthDateStr: string): string {
  if (!birthDateStr) return ''
  // HubSpot stores birthdate as midnight UTC timestamp (ms) or as YYYY-MM-DD
  let birthDate: Date
  if (/^\d+$/.test(birthDateStr)) {
    birthDate = new Date(parseInt(birthDateStr, 10))
  } else {
    birthDate = new Date(birthDateStr)
  }
  if (isNaN(birthDate.getTime())) return ''

  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age > 0 ? String(age) : ''
}

async function inferGender(firstName: string): Promise<string> {
  if (!firstName) return ''
  try {
    const response = await fetch(
      `https://api.genderize.io?name=${encodeURIComponent(firstName.trim())}`
    )
    if (!response.ok) return ''
    const data = await response.json()
    if (data.gender && data.probability >= 0.7) {
      return data.gender // 'male' or 'female'
    }
    return ''
  } catch {
    return ''
  }
}

async function fetchFormSubmissionsForContact(
  token: string,
  formGuids: string[],
  contactEmail: string
): Promise<Record<string, string>> {
  if (!contactEmail || formGuids.length === 0) return {}

  const answers: Record<string, string> = {}
  const emailLower = contactEmail.toLowerCase()

  for (const guid of formGuids) {
    const trimmedGuid = guid.trim()
    if (!trimmedGuid) continue

    try {
      let after = ''
      let found = false

      // Paginate through submissions (newest first) to find matching contact
      for (let page = 0; page < 10 && !found; page++) {
        const url = `https://api.hubapi.com/form-integrations/v1/submissions/forms/${trimmedGuid}?limit=50${after ? `&after=${after}` : ''}`
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) {
          console.error(`Form submissions error for ${trimmedGuid}:`, response.status)
          break
        }

        const data: FormSubmissionsResponse = await response.json()

        for (const submission of data.results) {
          const emailField = submission.values.find(
            (v) => v.name === 'email' && v.value.toLowerCase() === emailLower
          )
          if (emailField) {
            // Found matching submission — extract all non-email fields
            for (const field of submission.values) {
              if (field.name !== 'email' && field.value) {
                // Use the field name as key (these are HubSpot internal names)
                answers[field.name] = field.value
              }
            }
            found = true
            break
          }
        }

        if (data.paging?.next?.after) {
          after = data.paging.next.after
        } else {
          break
        }
      }
    } catch (err) {
      console.error(`Error fetching form ${trimmedGuid}:`, err)
    }
  }

  return answers
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const contactId = req.query.contactid as string | undefined
  if (!contactId) {
    return res.status(400).json({ error: 'Missing contactid parameter' })
  }

  const token = process.env.HUBSPOT_TOKEN || process.env.HUBSPOT_SECRET
  if (!token) {
    return res.status(500).json({ error: 'HUBSPOT_TOKEN not configured' })
  }

  try {
    // 1. Fetch contact with extra properties
    const contactUrl = `https://api.hubapi.com/crm/v3/objects/contacts/${encodeURIComponent(contactId)}?properties=blood_test_hl7,firstname,lastname,email,date_of_birth`
    const contactResponse = await fetch(contactUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!contactResponse.ok) {
      const errorBody = await contactResponse.text()
      console.error('HubSpot API error:', contactResponse.status, errorBody)
      return res.status(contactResponse.status).json({
        error: `HubSpot API error (${contactResponse.status})`,
      })
    }

    const contactData = await contactResponse.json()
    const props = contactData?.properties || {}

    const hl7 = props.blood_test_hl7 || ''
    const firstName = props.firstname || ''
    const lastName = props.lastname || ''
    const email = props.email || ''
    const birthDate = props.date_of_birth || ''

    // 2. Calculate age from birthdate
    const age = calculateAge(birthDate)

    // 3. Infer gender from firstname via Genderize.io
    const sex = await inferGender(firstName)

    // 4. Fetch medical questionnaire form submissions
    const formGuidsRaw = process.env.medical_form_guid || ''
    const formGuids = formGuidsRaw.split(',').map((g) => g.trim()).filter(Boolean)
    const medicalFormAnswers = await fetchFormSubmissionsForContact(token, formGuids, email)

    const contactName = [firstName, lastName].filter(Boolean).join(' ')

    return res.status(200).json({
      hl7,
      contactName,
      contactId,
      age,
      sex,
      medicalFormAnswers,
    })
  } catch (err) {
    console.error('HubSpot fetch error:', err)
    return res.status(500).json({ error: 'Failed to fetch from HubSpot' })
  }
}
