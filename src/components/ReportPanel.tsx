import { useTranslation } from 'react-i18next'
import { GeminiReportPanel, HairStatus } from '../types'
import { normalizeStatus, statusColor, statusLabel, isStatusAbnormal } from '../services/statusUtils'

interface ReportPanelProps {
  panel: GeminiReportPanel
}

function hairStatusColor(status: HairStatus): string {
  switch (status) {
    case 'optimal':
      return 'text-emerald-700 bg-emerald-50 border-emerald-200'
    case 'suboptimal':
      return 'text-yellow-700 bg-yellow-50 border-yellow-200'
    case 'concern':
      return 'text-red-700 bg-red-50 border-red-200'
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

function isRowHighlight(rawStatus: string, hairStatus: HairStatus): boolean {
  const medicalBad = isStatusAbnormal(rawStatus)
  const hairBad = hairStatus === 'suboptimal' || hairStatus === 'concern'
  return medicalBad || hairBad
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
              const normalized = normalizeStatus(bio.status)
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
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor(normalized)}`}
                    >
                      {statusLabel(normalized, t)}
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
