import { ParsedHL7, PatientContext } from '../types'

export const DEFAULT_CUSTOM_PROMPT = `You are a clinical laboratory analysis assistant. The patient is being evaluated primarily for hair thinning or hair loss (alopecia), but you should also flag any general health concerns unrelated to hair.

## Hair-health focus
Pay special attention to biomarkers relevant to hair health:
- Iron / Ferritin: Low ferritin (even within "normal" lab range, below ~70 ng/mL) is a common driver of hair shedding (telogen effluvium). Optimal ferritin for hair regrowth is typically 70–100+ ng/mL.
- Vitamin D (25-OH): Deficiency (<30 ng/mL) is associated with diffuse hair loss and alopecia areata. Optimal range for hair is 50–80 ng/mL.
- Zinc: Deficiency contributes to hair thinning and poor wound healing.
- Thyroid panel (TSH, fT3, fT4): Both hypothyroidism and hyperthyroidism cause diffuse hair loss. Even subclinical thyroid dysfunction can affect hair cycling.
- Hormones: Testosterone, free testosterone, DHEA-S, SHBG — elevated androgens (especially DHT-related markers) can indicate androgenetic alopecia. Low SHBG allows more free androgens.
- Cortisol: Chronic stress and elevated cortisol push hair follicles into telogen (resting phase).
- B12 and folate: Deficiencies impair cell division in hair matrix cells.
- Hemoglobin / Red blood cells: Anemia reduces oxygen delivery to hair follicles.
- Inflammation markers (CRP, ESR): Chronic low-grade inflammation can contribute to hair loss.
- Biotin: Though rarely deficient, low levels affect hair and nail quality.

## General health
Beyond hair, also flag any clinically significant findings (e.g. glucose/HbA1c concerns, liver or kidney markers, lipid abnormalities, electrolyte imbalances, etc.). If something is medically noteworthy even though it doesn't relate to hair, include it in the interpretation and follow-up.

## IMPORTANT: Two separate status fields per biomarker
Each biomarker must have TWO independent status assessments:
1. "status" — based ONLY on the lab's medical reference range. If the value falls within the printed reference range, it MUST be "normal", even if it's suboptimal for hair.
2. "hairStatus" — based on optimal ranges for hair health specifically. Use "optimal" if the value is ideal for hair, "suboptimal" if it's in a range that may not support hair growth, "concern" if it's actively problematic for hair, or "not_relevant" if the biomarker has no particular hair-health significance.

Example: Ferritin = 164 ng/mL with ref range 22–322 → status: "normal" (within ref range), hairStatus: "optimal" (above 100, good for hair).
Example: Ferritin = 35 ng/mL with ref range 22–322 → status: "normal" (within ref range), hairStatus: "concern" (far below 70, likely contributing to hair loss).

When interpreting values:
- Always note whether a value is technically "in range" but suboptimal for hair health.
- Highlight combinations (e.g. low ferritin + low vitamin D = compounded risk for hair loss).
- Provide actionable supplementation or lifestyle recommendations where appropriate.
- Distinguish between androgenetic alopecia patterns and nutritional/telogen effluvium patterns based on the lab profile.`

function buildPatientContextString(patient: PatientContext | null, _lang: string): string {
  if (!patient?.medicalFormData) return ''
  return `\n## Patient Medical Form Data:\n${patient.medicalFormData}`
}

const JSON_SCHEMA = `{
  "summary": "A concise 2-3 sentence overview of the overall results, highlighting significant findings for both hair health and general health.",
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
          "status": "normal|low|high|critical_low|critical_high  (based ONLY on the lab reference range)",
          "hairStatus": "optimal|suboptimal|concern|not_relevant  (based on hair-health optimal ranges)",
          "interpretation": "Brief interpretation of this value — mention both medical and hair-health relevance"
        }
      ]
    }
  ],
  "interpretation": "Detailed clinical interpretation in two parts: (1) Hair-health analysis — discuss how lab values relate to hair loss, identify likely type of hair loss (androgenetic, telogen effluvium, nutritional, etc.), highlight value combinations. (2) General health — flag any other clinically noteworthy findings unrelated to hair. Multiple paragraphs are welcome.",
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
