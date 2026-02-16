import { useTranslation } from 'react-i18next'
import { GeminiReportPanel, HairStatus } from '../types'

interface ReportPanelProps {
  panel: GeminiReportPanel
}

function medicalStatusColor(status: string): string {
  switch (status) {
    case 'normal':
      return 'text-green-700 bg-green-50 border-green-200'
    case 'low':
    case 'critical_low':
      return 'text-red-700 bg-red-50 border-red-200'
    case 'high':
    case 'critical_high':
      return 'text-red-700 bg-red-50 border-red-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

function medicalStatusLabel(status: string, t: (key: string) => string): string {
  switch (status) {
    case 'normal':
      return t('report.normal')
    case 'low':
      return t('report.low')
    case 'high':
      return t('report.high')
    case 'critical_low':
      return t('report.criticalLow')
    case 'critical_high':
      return t('report.criticalHigh')
    default:
      return status
  }
}

function hairStatusColor(status: HairStatus): string {
  switch (status) {
    case 'optimal':
      return 'text-emerald-700 bg-emerald-50 border-emerald-200'
    case 'suboptimal':
      return 'text-yellow-700 bg-yellow-50 border-yellow-200'
    case 'concern':
      return 'text-orange-700 bg-orange-50 border-orange-200'
    default:
      return ''
  }
}

function hairStatusLabel(status: HairStatus, t: (key: string) => string): string {
  switch (status) {
    case 'optimal':
      return t('report.hairOptimal')
    case 'suboptimal':
      return t('report.hairSuboptimal')
    case 'concern':
      return t('report.hairConcern')
    default:
      return ''
  }
}

function isRowHighlight(status: string, hairStatus: HairStatus): boolean {
  const medicalBad = status && status !== 'normal'
  const hairBad = hairStatus === 'suboptimal' || hairStatus === 'concern'
  return !!medicalBad || !!hairBad
}

export default function ReportPanel({ panel }: ReportPanelProps) {
  const { t } = useTranslation()

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden break-inside-avoid mb-4">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <h4 className="text-sm font-semibold text-gray-800">{panel.name}</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[36%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[14%]" />
            <col className="w-[15%]" />
            <col className="w-[15%]" />
          </colgroup>
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
              <th className="text-left px-4 py-2 font-medium">{t('report.biomarker')}</th>
              <th className="text-right px-4 py-2 font-medium">{t('report.value')}</th>
              <th className="text-left px-4 py-2 font-medium">{t('report.units')}</th>
              <th className="text-left px-4 py-2 font-medium">{t('report.refRange')}</th>
              <th className="text-center px-4 py-2 font-medium">{t('report.medicalStatus')}</th>
              <th className="text-center px-4 py-2 font-medium">{t('report.hairStatus')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {panel.biomarkers.map((bio, i) => {
              const showHair = bio.hairStatus && bio.hairStatus !== 'not_relevant'
              const highlight = isRowHighlight(bio.status, bio.hairStatus)
              return (
                <tr
                  key={i}
                  className={highlight ? 'bg-amber-50/80' : undefined}
                >
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
                  <td className="px-4 py-2 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${medicalStatusColor(bio.status)}`}
                    >
                      {medicalStatusLabel(bio.status, t)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    {showHair ? (
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${hairStatusColor(bio.hairStatus)}`}
                      >
                        {hairStatusLabel(bio.hairStatus, t)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">{t('report.hairNA')}</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
