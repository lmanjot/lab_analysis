import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { AuthState, AppView, ParsedHL7, PatientContext, GeminiReport, Patient } from './types'
import { initAuth, signIn, signOut, isTokenExpired, refreshToken } from './services/auth'
import { analyzeWithGemini, fileToBase64 } from './services/gemini'
import { buildHL7AnalysisPrompt, buildPDFAnalysisPrompt } from './services/prompts'
import Layout from './components/Layout'
import InputForm from './components/InputForm'
import AnalysisView from './components/AnalysisView'
import Report from './components/Report'

export default function App() {
  const { i18n } = useTranslation()
  const { t } = useTranslation()
  const [auth, setAuth] = useState<AuthState>({
    isSignedIn: false,
    accessToken: null,
    email: null,
    name: null,
    expiresAt: null,
  })
  const [view, setView] = useState<AppView>('input')
  const [report, setReport] = useState<GeminiReport | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    initAuth(setAuth)
  }, [])

  const ensureValidToken = useCallback((): string | null => {
    if (!auth.accessToken) return null
    if (isTokenExpired(auth)) {
      refreshToken()
      return null
    }
    return auth.accessToken
  }, [auth])

  const handleAnalyzeHL7 = useCallback(
    async (parsedData: ParsedHL7, rawHL7: string, patientCtx: PatientContext) => {
      const token = ensureValidToken()
      if (!token) {
        setError(t('errors.noToken'))
        return
      }

      setView('analyzing')
      setError(null)
      setPatient(parsedData.patient)

      try {
        const prompt = buildHL7AnalysisPrompt(parsedData, rawHL7, patientCtx, i18n.language)
        const result = await analyzeWithGemini(token, prompt)
        setReport(result)
        setView('report')
      } catch (err) {
        if (err instanceof Error && err.message === 'TOKEN_EXPIRED') {
          setError(t('auth.tokenExpired'))
          refreshToken()
        } else {
          setError(err instanceof Error ? err.message : t('errors.apiError'))
        }
        setView('input')
      }
    },
    [ensureValidToken, i18n.language, t]
  )

  const handleAnalyzePDF = useCallback(
    async (file: File, patientCtx: PatientContext) => {
      const token = ensureValidToken()
      if (!token) {
        setError(t('errors.noToken'))
        return
      }

      setView('analyzing')
      setError(null)
      setPatient(null)

      try {
        const pdfBase64 = await fileToBase64(file)
        const prompt = buildPDFAnalysisPrompt(patientCtx, i18n.language)
        const result = await analyzeWithGemini(token, prompt, pdfBase64)
        setReport(result)
        setView('report')
      } catch (err) {
        if (err instanceof Error && err.message === 'TOKEN_EXPIRED') {
          setError(t('auth.tokenExpired'))
          refreshToken()
        } else {
          setError(err instanceof Error ? err.message : t('errors.apiError'))
        }
        setView('input')
      }
    },
    [ensureValidToken, i18n.language, t]
  )

  const handleNewAnalysis = () => {
    setView('input')
    setReport(null)
    setPatient(null)
    setError(null)
  }

  return (
    <Layout auth={auth} onSignIn={signIn} onSignOut={signOut}>
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex justify-between items-center print:hidden">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 text-lg leading-none"
          >
            &times;
          </button>
        </div>
      )}

      {view === 'input' && (
        <InputForm auth={auth} onAnalyzeHL7={handleAnalyzeHL7} onAnalyzePDF={handleAnalyzePDF} />
      )}

      {view === 'analyzing' && <AnalysisView />}

      {view === 'report' && report && (
        <Report report={report} patient={patient} onNewAnalysis={handleNewAnalysis} />
      )}
    </Layout>
  )
}
