import { ParsedHL7, PatientContext } from '../types'

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

export function buildHL7AnalysisPrompt(
  parsedData: ParsedHL7,
  rawHL7: string,
  patientContext: PatientContext | null,
  lang: string
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

  return `You are a clinical laboratory analysis assistant. Analyze the following blood test results and provide a structured medical report.

${langInstruction}

${patientInfo}

## Parsed Observations:
${observationsSummary}

## Raw HL7 Message (for additional context):
${rawHL7}

## Instructions:
Provide your analysis as a JSON object with the following structure. Return ONLY valid JSON, no markdown fences or extra text.

{
  "summary": "A concise 2-3 sentence overview of the overall results, highlighting any significant findings.",
  "panels": [
    {
      "name": "Panel Name (e.g. Complete Blood Count, Lipid Panel, Liver Function, Thyroid, Vitamins & Minerals, Hormones, etc.)",
      "biomarkers": [
        {
          "code": "TEST_CODE",
          "name": "Full biomarker name",
          "value": "numeric value",
          "units": "unit of measurement",
          "refRange": "reference range",
          "status": "normal|low|high|critical_low|critical_high",
          "interpretation": "Brief interpretation of this specific value"
        }
      ]
    }
  ],
  "interpretation": "Detailed clinical interpretation discussing correlations between values, potential underlying conditions, and clinical significance. Multiple paragraphs are welcome.",
  "followUp": [
    "Specific follow-up recommendation 1 with reasoning",
    "Specific follow-up recommendation 2 with reasoning"
  ]
}`
}

export function buildPDFAnalysisPrompt(
  patientContext: PatientContext | null,
  lang: string
): string {
  const langInstruction = lang === 'de'
    ? 'Antworte vollständig auf Deutsch.'
    : 'Respond entirely in English.'

  const patientInfo = buildPatientContextString(patientContext, lang)

  return `You are a clinical laboratory analysis assistant. The attached PDF contains a laboratory report with blood test results. Extract all biomarker values and provide a structured medical analysis.

${langInstruction}

${patientInfo}

## Instructions:
1. Extract all biomarker values from the PDF
2. Group them by clinical panel
3. Identify abnormal values
4. Provide clinical interpretation

Return your analysis as a JSON object with the following structure. Return ONLY valid JSON, no markdown fences or extra text.

{
  "summary": "A concise 2-3 sentence overview of the overall results, highlighting any significant findings.",
  "panels": [
    {
      "name": "Panel Name (e.g. Complete Blood Count, Lipid Panel, Liver Function, Thyroid, Vitamins & Minerals, Hormones, etc.)",
      "biomarkers": [
        {
          "code": "TEST_CODE",
          "name": "Full biomarker name",
          "value": "numeric value",
          "units": "unit of measurement",
          "refRange": "reference range",
          "status": "normal|low|high|critical_low|critical_high",
          "interpretation": "Brief interpretation of this specific value"
        }
      ]
    }
  ],
  "interpretation": "Detailed clinical interpretation discussing correlations between values, potential underlying conditions, and clinical significance. Multiple paragraphs are welcome.",
  "followUp": [
    "Specific follow-up recommendation 1 with reasoning",
    "Specific follow-up recommendation 2 with reasoning"
  ]
}`
}
