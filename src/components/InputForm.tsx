import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ParsedHL7, PatientContext as PatientContextType, AuthState } from '../types'
import { parseHL7Message } from '../services/hl7'
import { DEFAULT_CUSTOM_PROMPT } from '../services/prompts'
import PatientContext from './PatientContext'
import ParsePreview from './ParsePreview'

interface InputFormProps {
  auth: AuthState
  onAnalyzeHL7: (parsedData: ParsedHL7, rawHL7: string, patientCtx: PatientContextType, customPrompt: string) => void
  onAnalyzePDF: (file: File, patientCtx: PatientContextType, customPrompt: string) => void
  preloadedHL7?: string
  hubspotContactName?: string
  hubspotPatientCtx?: PatientContextType
}

type Tab = 'hl7' | 'pdf'

export default function InputForm({ auth, onAnalyzeHL7, onAnalyzePDF, preloadedHL7, hubspotContactName, hubspotPatientCtx }: InputFormProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<Tab>('hl7')
  const [hl7Text, setHl7Text] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [patientCtx, setPatientCtx] = useState<PatientContextType>({})
  const [customPrompt, setCustomPrompt] = useState(DEFAULT_CUSTOM_PROMPT)
  const [showPrompt, setShowPrompt] = useState(false)
  const [showHL7Input, setShowHL7Input] = useState(!preloadedHL7)
  const [showDebug, setShowDebug] = useState(false)
  const [showMedicalForm, setShowMedicalForm] = useState(false)
  const [parsedPreview, setParsedPreview] = useState<ParsedHL7 | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hl7Applied = useRef(false)
  const ctxApplied = useRef(false)

  // Apply preloaded HL7 from HubSpot once
  useEffect(() => {
    if (preloadedHL7 && !hl7Applied.current) {
      hl7Applied.current = true
      setHl7Text(preloadedHL7)
      try {
        const parsed = parseHL7Message(preloadedHL7)
        setParsedPreview(parsed)
      } catch { /* ignore parse errors on preload */ }
    }
  }, [preloadedHL7])

  // Apply patient context from HubSpot once
  useEffect(() => {
    if (hubspotPatientCtx && !ctxApplied.current) {
      ctxApplied.current = true
      setPatientCtx((prev) => ({ ...prev, ...hubspotPatientCtx }))
    }
  }, [hubspotPatientCtx])

  const handleHL7Change = (text: string) => {
    setHl7Text(text)
    setParseError(null)
    setParsedPreview(null)

    if (text.trim()) {
      try {
        const parsed = parseHL7Message(text)
        setParsedPreview(parsed)
      } catch {
        setParseError(t('errors.parseError'))
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setParseError(t('errors.invalidPdf'))
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setParseError(t('errors.pdfTooLarge'))
      return
    }

    setPdfFile(file)
    setParseError(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type === 'application/pdf') {
      if (file.size > 10 * 1024 * 1024) {
        setParseError(t('errors.pdfTooLarge'))
        return
      }
      setPdfFile(file)
      setParseError(null)
    } else {
      setParseError(t('errors.invalidPdf'))
    }
  }

  const handleAnalyze = () => {
    if (activeTab === 'hl7') {
      if (!hl7Text.trim()) return
      try {
        const parsed = parseHL7Message(hl7Text)
        onAnalyzeHL7(parsed, hl7Text, patientCtx, customPrompt)
      } catch {
        setParseError(t('errors.parseError'))
      }
    } else {
      if (!pdfFile) return
      onAnalyzePDF(pdfFile, patientCtx, customPrompt)
    }
  }

  const canAnalyze =
    auth.isSignedIn &&
    ((activeTab === 'hl7' && hl7Text.trim() && !parseError) ||
      (activeTab === 'pdf' && pdfFile))

  return (
    <div className="space-y-6">
      {!auth.isSignedIn && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-sm text-blue-800">{t('auth.signInRequired')}</p>
        </div>
      )}

      {/* Only show when HL7 tab and no data */}
      {activeTab === 'hl7' && !hl7Text.trim() && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <p className="text-sm text-amber-800">{t('input.noHL7Data')}</p>
        </div>
      )}

      {/* 1. Run analysis button */}
      <button
        onClick={handleAnalyze}
        disabled={!canAnalyze}
        className="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
      >
        {t('input.analyze')}
      </button>

      {/* 2. Parsed data preview */}
      {parsedPreview && activeTab === 'hl7' && (
        <ParsePreview data={parsedPreview} />
      )}

      {/* 3. Debug: HL7/PDF upload, medical form, AI prompt — collapsed by default */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <span>{t('input.debugSection')}</span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${showDebug ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showDebug && (
          <div className="border-t border-gray-100 space-y-4 p-5">
            <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('hl7')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'hl7'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {t('input.tabHL7')}
                </button>
                <button
                  onClick={() => setActiveTab('pdf')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'pdf'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {t('input.tabPDF')}
                </button>
              </div>
              <div className="p-5 bg-white">
                {activeTab === 'hl7' ? (
                  <div>
                    {preloadedHL7 && (
                      <button
                        onClick={() => setShowHL7Input(!showHL7Input)}
                        className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2 hover:text-gray-900"
                      >
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform ${showHL7Input ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        {t('input.hl7Label')}
                      </button>
                    )}
                    {(!preloadedHL7 || showHL7Input) && (
                      <textarea
                        value={hl7Text}
                        onChange={(e) => handleHL7Change(e.target.value)}
                        placeholder={t('input.hl7Placeholder')}
                        rows={10}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"
                      />
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('input.pdfLabel')}
                    </label>
                    <div
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                    >
                      {pdfFile ? (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-700 font-medium">
                            {t('input.pdfSelected', { filename: pdfFile.name })}
                          </p>
                          <button
                            onClick={(e) => { e.stopPropagation(); setPdfFile(null) }}
                            className="text-xs text-red-600 hover:text-red-800 underline"
                          >
                            {t('input.pdfRemove')}
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">{t('input.pdfDrop')}</p>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>
                  </div>
                )}
                {parseError && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-sm text-red-700">{parseError}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowMedicalForm(!showMedicalForm)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 mb-2"
              >
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${showMedicalForm ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                {t('patient.title')}
              </button>
              {showMedicalForm && (
                <PatientContext value={patientCtx} onChange={setPatientCtx} />
              )}
            </div>

            <div>
              <button
                onClick={() => setShowPrompt(!showPrompt)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 mb-2"
              >
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${showPrompt ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                {t('input.customPrompt')}
              </button>
              {showPrompt && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-2">{t('input.customPromptHint')}</p>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-mono leading-relaxed focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"
                  />
                  {customPrompt !== DEFAULT_CUSTOM_PROMPT && (
                    <button
                      onClick={() => setCustomPrompt(DEFAULT_CUSTOM_PROMPT)}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Reset to default
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
