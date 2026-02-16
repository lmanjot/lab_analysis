import { useTranslation } from 'react-i18next'
import { GeminiReport, Patient } from '../types'
import ReportPanel from './ReportPanel'

interface ReportProps {
  report: GeminiReport
  patient: Patient | null
  onNewAnalysis: () => void
}

export default function Report({ report, patient, onNewAnalysis }: ReportProps) {
  const { t } = useTranslation()

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Action buttons - hidden in print */}
      <div className="flex gap-3 print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          {t('report.print')}
        </button>
        <button
          onClick={onNewAnalysis}
          className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          {t('report.newAnalysis')}
        </button>
      </div>

      {/* Report content */}
      <div className="bg-white rounded-lg border border-gray-200 print:border-none print:shadow-none">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 print:border-gray-300">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center print:bg-blue-600">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">{t('report.title')}</h2>
          </div>
          <p className="text-xs text-gray-400">
            {new Date().toLocaleDateString()} — {t('app.title')}
          </p>
        </div>

        {/* Patient info */}
        {patient && (
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {t('report.patient')}
            </h3>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-700">
              <span>
                <span className="font-medium">{patient.firstName} {patient.lastName}</span>
              </span>
              {patient.birthDate && <span>DOB: {patient.birthDate}</span>}
              {patient.sex && <span>Sex: {patient.sex}</span>}
              {patient.id && <span>ID: {patient.id}</span>}
            </div>
          </div>
        )}

        {/* Summary */}
        {report.summary && (
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {t('report.summary')}
            </h3>
            <p className="text-sm text-gray-800 leading-relaxed">{report.summary}</p>
          </div>
        )}

        {/* Panels */}
        {report.panels.length > 0 && (
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              {t('report.panels')}
            </h3>
            {report.panels.map((panel, i) => (
              <ReportPanel key={i} panel={panel} />
            ))}
          </div>
        )}

        {/* Interpretation */}
        {report.interpretation && (
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {t('report.interpretation')}
            </h3>
            <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
              {report.interpretation}
            </div>
          </div>
        )}

        {/* Follow-up */}
        {report.followUp.length > 0 && (
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {t('report.followUp')}
            </h3>
            <ul className="space-y-2">
              {report.followUp.map((rec, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-800">
                  <span className="text-blue-500 font-bold mt-0.5">&#8226;</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Disclaimer */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg">
          <p className="text-xs text-gray-400 italic">{t('report.disclaimer')}</p>
        </div>
      </div>
    </div>
  )
}
