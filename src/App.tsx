import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { AuthState, AppView, ParsedHL7, PatientContext, GeminiReport, Patient } from './types'
import { initAuth, signIn, signOut, isTokenExpired, refreshToken, getAuthStatus } from './services/auth'
import { analyzeWithGemini, fileToBase64 } from './services/gemini'
import { buildHL7AnalysisPrompt, buildPDFAnalysisPrompt } from './services/prompts'
import { getContactIdFromURL, fetchHL7FromHubSpot } from './services/hubspot'
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
  const [preloadedHL7, setPreloadedHL7] = useState<string | undefined>()
  const [hubspotContactName, setHubspotContactName] = useState<string | undefined>()
  const [hubspotLoading, setHubspotLoading] = useState(false)

  const [authConfigError, setAuthConfigError] = useState<string | null>(null)

  useEffect(() => {
    initAuth(setAuth)
    const status = getAuthStatus()
    if (status.error === 'MISSING_CLIENT_ID') {
      setAuthConfigError(
        'Google OAuth is not configured.\n\nOn Vercel: set goauthid in Environment Variables.\nFor local dev: create a .env file with VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com\nThen restart the dev server.'
      )
    }

    // Fetch HL7 from HubSpot if contactid URL param is present
    const contactId = getContactIdFromURL()
    if (contactId) {
      setHubspotLoading(true)
      fetchHL7FromHubSpot(contactId)
        .then((data) => {
          if (data.hl7) {
            setPreloadedHL7(data.hl7)
          } else {
            setError(`No HL7 data found for contact ${data.contactName || contactId}`)
          }
          if (data.contactName) {
            setHubspotContactName(data.contactName)
          }
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Failed to load data from HubSpot')
        })
        .finally(() => setHubspotLoading(false))
    }
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
    async (parsedData: ParsedHL7, rawHL7: string, patientCtx: PatientContext, customPrompt: string) => {
      const token = ensureValidToken()
      if (!token) {
        setError(t('errors.noToken'))
        return
      }

      setView('analyzing')
      setError(null)
      setPatient(parsedData.patient)

      try {
        const prompt = buildHL7AnalysisPrompt(parsedData, rawHL7, patientCtx, i18n.language, customPrompt)
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
    async (file: File, patientCtx: PatientContext, customPrompt: string) => {
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
        const prompt = buildPDFAnalysisPrompt(patientCtx, i18n.language, customPrompt)
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

  const handleSignIn = () => {
    const err = signIn()
    if (err) setError(err)
  }

  return (
    <Layout auth={auth} onSignIn={handleSignIn} onSignOut={signOut}>
      {authConfigError && (
        <div className="mb-6 bg-amber-50 border border-amber-300 rounded-lg p-4 print:hidden">
          <h3 className="text-sm font-semibold text-amber-800 mb-1">Setup Required</h3>
          <pre className="text-xs text-amber-700 whitespace-pre-wrap font-mono">{authConfigError}</pre>
        </div>
      )}

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

      {hubspotLoading && (
        <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4 text-center print:hidden">
          <p className="text-sm text-gray-600">{t('input.hubspotLoading')}</p>
        </div>
      )}

      {view === 'input' && !hubspotLoading && (
        <InputForm
          auth={auth}
          onAnalyzeHL7={handleAnalyzeHL7}
          onAnalyzePDF={handleAnalyzePDF}
          preloadedHL7={preloadedHL7}
          hubspotContactName={hubspotContactName}
        />
      )}

      {view === 'analyzing' && <AnalysisView />}

      {view === 'report' && report && (
        <Report report={report} patient={patient} onNewAnalysis={handleNewAnalysis} />
      )}
    </Layout>
  )
}
