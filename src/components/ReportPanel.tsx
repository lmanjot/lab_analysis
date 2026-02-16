import { useTranslation } from 'react-i18next'
import { GeminiReportPanel } from '../types'

interface ReportPanelProps {
  panel: GeminiReportPanel
}

function statusColor(status: string): string {
  switch (status) {
    case 'normal':
      return 'text-green-700 bg-green-50'
    case 'low':
      return 'text-amber-700 bg-amber-50'
    case 'high':
      return 'text-amber-700 bg-amber-50'
    case 'critical_low':
      return 'text-red-700 bg-red-50'
    case 'critical_high':
      return 'text-red-700 bg-red-50'
    default:
      return 'text-gray-600 bg-gray-50'
  }
}

function statusLabel(status: string, t: (key: string) => string): string {
  switch (status) {
    case 'normal':
      return t('report.normal')
    case 'low':
      return t('report.belowRef')
    case 'high':
      return t('report.aboveRef')
    case 'critical_low':
      return t('report.belowRef') + ' (!)'
    case 'critical_high':
      return t('report.aboveRef') + ' (!)'
    default:
      return status
  }
}

export default function ReportPanel({ panel }: ReportPanelProps) {
  const { t } = useTranslation()

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden break-inside-avoid mb-4">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <h4 className="text-sm font-semibold text-gray-800">{panel.name}</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
              <th className="text-left px-4 py-2 font-medium">{t('report.biomarker')}</th>
              <th className="text-right px-4 py-2 font-medium">{t('report.value')}</th>
              <th className="text-left px-4 py-2 font-medium">{t('report.units')}</th>
              <th className="text-left px-4 py-2 font-medium">{t('report.refRange')}</th>
              <th className="text-left px-4 py-2 font-medium">{t('report.status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {panel.biomarkers.map((bio, i) => (
              <tr key={i}>
                <td className="px-4 py-2">
                  <div className="font-medium text-gray-900">{bio.name}</div>
                  {bio.interpretation && (
                    <div className="text-xs text-gray-500 mt-0.5">{bio.interpretation}</div>
                  )}
                </td>
                <td className="px-4 py-2 text-right font-mono font-medium text-gray-900">
                  {bio.value}
                </td>
                <td className="px-4 py-2 text-gray-500">{bio.units}</td>
                <td className="px-4 py-2 text-gray-500">{bio.refRange}</td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(bio.status)}`}
                  >
                    {statusLabel(bio.status, t)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
