import { ParsedHL7, PatientContext } from '../types'

export const DEFAULT_CUSTOM_PROMPT = `You are a clinical laboratory analysis assistant specializing in hair loss (alopecia). The patient is being evaluated for hair thinning or hair loss.

Focus your interpretation on biomarkers that are most relevant to hair health:
- Iron / Ferritin: Low ferritin (even within "normal" range, below ~70 ng/mL) is a common driver of hair shedding (telogen effluvium). Optimal ferritin for hair regrowth is typically 70–100+ ng/mL.
- Vitamin D (25-OH): Deficiency (<30 ng/mL) is associated with diffuse hair loss and alopecia areata. Optimal range for hair is 50–80 ng/mL.
- Zinc: Deficiency contributes to hair thinning and poor wound healing. Evaluate whether levels are in the optimal range.
- Thyroid panel (TSH, fT3, fT4): Both hypothyroidism and hyperthyroidism cause diffuse hair loss. Even subclinical thyroid dysfunction can affect hair cycling.
- Hormones: Testosterone, free testosterone, DHEA-S, SHBG — elevated androgens (especially DHT-related markers) can indicate androgenetic alopecia. Low SHBG allows more free androgens.
- Cortisol: Chronic stress and elevated cortisol push hair follicles into telogen (resting phase).
- B12 and folate: Deficiencies impair cell division in hair matrix cells.
- Hemoglobin / Red blood cells: Anemia (iron-deficiency or otherwise) reduces oxygen delivery to hair follicles.
- Inflammation markers (CRP, ESR): Chronic low-grade inflammation can contribute to hair loss.
- Biotin: Though rarely deficient, low levels affect hair and nail quality.

When interpreting values:
- Always note whether a value is technically "in range" but suboptimal for hair health.
- Highlight combinations (e.g. low ferritin + low vitamin D = compounded risk for hair loss).
- Provide actionable supplementation or lifestyle recommendations where appropriate.
- Distinguish between androgenetic alopecia patterns and nutritional/telogen effluvium patterns based on the lab profile.`

function buildPatientContextString(patient: PatientContext | null, lang: string): string {
  if (!patient) return ''
  const parts: string[] = []
  if (patient.age) parts.push(lang === 'de' ? `Alter: ${patient.age}` : `Age: ${patient.age}`)
  if (patient.sex) parts.push(lang === 'de' ? `Geschlecht: ${patient.sex}` : `Sex: ${patient.sex}`)
  if (patient.weight) parts.push(lang === 'de' ? `Gewicht: ${patient.weight} kg` : `Weight: ${patient.weight} kg`)
  if (patient.height) parts.push(lang === 'de' ? `Grösse: ${patient.height} cm` : `Height: ${patient.height} cm`)
  if (patient.conditions) parts.push(lang === 'de' ? `Bekannte Erkrankungen: ${patient.conditions}` : `Known conditions: ${patient.conditions}`)
  return parts.length > 0 ? `\nPatient context: ${parts.join(', ')}` : ''
}

const JSON_SCHEMA = `{
  "summary": "A concise 2-3 sentence overview of the overall results, highlighting significant findings relevant to hair loss.",
  "panels": [
    {
      "name": "Panel Name (e.g. Iron & Ferritin, Thyroid, Hormones, Vitamins & Minerals, Complete Blood Count, Inflammation, etc.)",
      "biomarkers": [
        {
          "code": "TEST_CODE",
          "name": "Full biomarker name",
          "value": "numeric value",
          "units": "unit of measurement",
          "refRange": "reference range",
          "status": "normal|low|high|critical_low|critical_high",
          "interpretation": "Brief interpretation of this specific value in the context of hair health"
        }
      ]
    }
  ],
  "interpretation": "Detailed clinical interpretation discussing how these lab values relate to hair loss. Discuss correlations between values, identify the likely type of hair loss (androgenetic, telogen effluvium, nutritional, etc.), and explain the clinical significance. Multiple paragraphs are welcome.",
  "followUp": [
    "Specific follow-up recommendation with reasoning",
    "Supplementation or treatment suggestion if supported by the lab values"
  ]
}`

export function buildHL7AnalysisPrompt(
  parsedData: ParsedHL7,
  rawHL7: string,
  patientContext: PatientContext | null,
  lang: string,
  customPrompt: string
): string {
  const langInstruction = lang === 'de'
    ? 'Antworte vollständig auf Deutsch.'
    : 'Respond entirely in English.'

  const patientInfo = buildPatientContextString(patientContext, lang)

  const observationsSummary = parsedData.observations
    .map((obs) => {
      const parts = [`${obs.code}: ${obs.text} = ${obs.value}`]
      if (obs.units) parts.push(obs.units)
      if (obs.refRange) parts.push(`(ref: ${obs.refRange})`)
      if (obs.mara_status) parts.push(`[${obs.mara_status}]`)
      if (obs.mara_range) parts.push(`{ideal: ${obs.mara_range}}`)
      return parts.join(' ')
    })
    .join('\n')

  return `${customPrompt}

${langInstruction}

${patientInfo}

## Parsed Observations:
${observationsSummary}

## Raw HL7 Message (for additional context):
${rawHL7}

## Output Instructions:
Provide your analysis as a JSON object with the following structure. Return ONLY valid JSON, no markdown fences or extra text.

${JSON_SCHEMA}`
}

export function buildPDFAnalysisPrompt(
  patientContext: PatientContext | null,
  lang: string,
  customPrompt: string
): string {
  const langInstruction = lang === 'de'
    ? 'Antworte vollständig auf Deutsch.'
    : 'Respond entirely in English.'

  const patientInfo = buildPatientContextString(patientContext, lang)

  return `${customPrompt}

The attached PDF contains a laboratory report with blood test results. Extract all biomarker values and provide a structured medical analysis.

${langInstruction}

${patientInfo}

## Instructions:
1. Extract all biomarker values from the PDF
2. Group them by clinical panel
3. Identify abnormal values
4. Provide clinical interpretation focused on hair health

Return your analysis as a JSON object with the following structure. Return ONLY valid JSON, no markdown fences or extra text.

${JSON_SCHEMA}`
}
