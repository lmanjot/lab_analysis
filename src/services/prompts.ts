import { ParsedHL7, PatientContext } from '../types'

export const DEFAULT_CUSTOM_PROMPT = `You are a clinical biomarker analysis assistant for a dermatology practice specialized in hair regeneration.

The patient presents with active hair loss and seeks an effective treatment solution.

## Diagnostic Principle
Blood tests are used to detect deficiencies, systemic conditions, or modifiers.
If biomarkers are largely normal, this strengthens the likelihood of androgenetic or pattern-based alopecia rather than deficiency-driven shedding.
Do not assume hair loss must be explained by lab abnormalities.
Correlate lab findings with available clinical data (age, sex, pattern distribution, medical record) when determining likely driver.

## Therapeutic Framework
PRP and exosome therapies are primary evidence-based regenerative treatments and are generally indicated unless contraindicated.
A combined PRP + exosome approach is highly effective.
In the absence of contraindications, regenerative therapy should be considered the central treatment strategy.
Structured supplementation (Māra Density) supports:
- Androgen modulation
- Reduction of perifollicular inflammation/fibrosis
- Optimization of the follicular micro-environment
Prefer Māra Density over isolated zinc or vitamin D unless a clear, significant deficiency requires targeted correction.
Do not present vitamin correction alone as definitive treatment unless severe deficiency clearly explains the hair loss.

## Mandatory: Two Status Fields per Biomarker
For each biomarker:
- "status" → strictly based on lab reference range
- "hairStatus" → "optimal" | "suboptimal" | "concern" | "not_relevant"
Never override medical reference interpretation.

## OUTPUT STRUCTURE (Follow Exactly, No Redundancy)

### 1. General Health Assessment
Briefly identify any clinically significant systemic findings (e.g., thyroid dysfunction, metabolic abnormalities, anemia, inflammation, liver/kidney concerns).
If none: state "No clinically significant systemic abnormalities identified."
No hair interpretation here.

### 2. Hair-Relevant Biomarker Overview
Provide one single concise sentence summarizing:
The overall lab profile (Normal / Mostly normal / Significant abnormalities)
Only clinically relevant suboptimal or abnormal hair-related markers (if present)
Do not use bullet points.
Do not restate values.
Do not interpret here.
If no hair-relevant abnormalities are present, state:
"No significant hair-relevant biomarker abnormalities identified."

### 3. Etiology Assessment
One clear paragraph identifying the most likely primary driver:
- Androgenetic / pattern-based
- Deficiency-driven
- Stress-related
- Inflammatory
- Mixed
Select the dominant driver based on available data. State it directly. Do not use hedging phrases such as "unlikely to be solely" or "may not be entirely."
If no clinically meaningful deficiencies are identified, state clearly that the laboratory profile does not support deficiency-driven hair loss as the primary cause.
No repetition of lab values.

### 4. Regenerative Indication
State clearly:
- Whether PRP / exosome therapy is indicated (generally yes unless contraindicated)
- Whether correction-first strategy is required (only if severe deficiency)
- Whether structured supplementation should accompany therapy
Be concise and decisive.

### 5. Action Plan (Prioritized)
- Regenerative therapy recommendation
- Structured supplementation if appropriate
- Targeted correction only if necessary
- Separate medical follow-up if indicated
No repetition. No narrative duplication.
Deliver a clear therapeutic direction.`

function buildPatientContextString(patient: PatientContext | null, _lang: string): string {
  if (!patient?.medicalFormData) return ''
  return `
## Patient Medical Record (from intake questionnaire):
${patient.medicalFormData}

IMPORTANT: Analyze this medical record carefully. Cross-reference the patient's self-reported conditions, medications, symptoms, and history with the lab results. In the "medicalRecordAnalysis" field of your response, provide a brief analysis of the medical record itself — summarize key findings from the questionnaire (age, sex, relevant conditions, medications, symptoms) and note how they may relate to the lab values and hair loss. This section should help the clinician quickly understand the patient profile before reading the lab interpretation.`
}

/** Output language follows the UI language at analysis launch: German (de/de-*) or English. */
function getLanguageInstruction(lang: string): string {
  const isGerman = typeof lang === 'string' && lang.toLowerCase().startsWith('de')
  return isGerman
    ? 'CRITICAL — OUTPUT LANGUAGE: Respond ONLY in German (Deutsch). Every field in your JSON (medicalRecordAnalysis, generalHealth, hairSummary, etiologyAssessment, regenerativeIndication, panel names, biomarker names, interpretations, actionPlan items) must be written in German. Do not mix in any English.'
    : 'CRITICAL — OUTPUT LANGUAGE: Respond ONLY in English. Every field in your JSON must be written in English. Do not mix in any other language.'
}

const JSON_SCHEMA = `{
  "medicalRecordAnalysis": "Brief analysis of the patient's medical record/questionnaire — summarize the patient profile (age, sex, relevant conditions, medications, lifestyle factors, symptoms) and note how these may interact with the lab results and hair health. If no medical record was provided, set this to an empty string.",
  "generalHealth": "Section 1: General Health Assessment. Briefly identify any clinically significant systemic findings. If none, state: No clinically significant systemic abnormalities identified. No hair interpretation here.",
  "hairSummary": "Section 2: Hair-Relevant Biomarker Overview. One single concise sentence: overall lab profile (Normal / Mostly normal / Significant abnormalities) and only clinically relevant suboptimal or abnormal hair-related markers if present. No bullet points, no restating values. If none: No significant hair-relevant biomarker abnormalities identified.",
  "etiologyAssessment": "Section 3: Etiology Assessment. One clear paragraph identifying the most likely primary driver (androgenetic, deficiency-driven, stress-related, inflammatory, mixed). State it directly; no hedging. If no clinically meaningful deficiencies are identified, state that the laboratory profile does not support deficiency-driven hair loss as the primary cause. No repetition of lab values.",
  "regenerativeIndication": "Section 4: Regenerative Indication. Whether PRP/exosome therapy is indicated, whether correction-first strategy is required, whether structured supplementation should accompany therapy. Keep concise.",
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
          "interpretation": "Brief interpretation of this value"
        }
      ]
    }
  ],
  "actionPlan": [
    "Section 5: Prioritized action items — regenerative therapy recommendation, structured supplementation if appropriate, targeted correction only if necessary, separate medical follow-up if indicated"
  ]
}`

export function buildHL7AnalysisPrompt(
  parsedData: ParsedHL7,
  rawHL7: string,
  patientContext: PatientContext | null,
  lang: string,
  customPrompt: string
): string {
  const langInstruction = getLanguageInstruction(lang)
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

  return `${langInstruction}

${customPrompt}

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
  const langInstruction = getLanguageInstruction(lang)
  const patientInfo = buildPatientContextString(patientContext, lang)

  return `${langInstruction}

${customPrompt}

The attached PDF contains a laboratory report with blood test results. Extract all biomarker values and provide a structured medical analysis.

${patientInfo}

## Instructions:
1. Extract all biomarker values from the PDF
2. Group them by clinical panel
3. Identify abnormal values
4. Provide clinical interpretation focused on hair health

Return your analysis as a JSON object with the following structure. Return ONLY valid JSON, no markdown fences or extra text.

${JSON_SCHEMA}`
}
