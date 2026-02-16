import { useTranslation } from 'react-i18next'
import { ParsedHL7 } from '../types'
import { normalizeStatus, statusColor, statusLabel } from '../services/statusUtils'

interface ParsePreviewProps {
  data: ParsedHL7
}

function statusBadge(rawStatus: string, t: (key: string) => string) {
  const normalized = normalizeStatus(rawStatus)
  const color = statusColor(normalized)
  const label = normalized === 'unknown' ? (rawStatus || '—') : statusLabel(normalized, t)
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {label}
    </span>
  )
}

export default function ParsePreview({ data }: ParsePreviewProps) {
  const { t } = useTranslation()

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">{t('input.parsePreview')}</h3>
      </div>

      {data.patient && (
        <div className="px-5 py-3 border-b border-gray-100">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span className="text-gray-500">
              {t('preview.patientName')}:{' '}
              <span className="text-gray-900 font-medium">
                {data.patient.firstName} {data.patient.lastName}
              </span>
            </span>
            {data.patient.birthDate && (
              <span className="text-gray-500">
                {t('preview.dob')}: <span className="text-gray-900">{data.patient.birthDate}</span>
              </span>
            )}
            {data.patient.sex && (
              <span className="text-gray-500">
                {t('preview.sex')}: <span className="text-gray-900">{data.patient.sex}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {data.observations.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-2 font-medium">{t('preview.code')}</th>
                <th className="text-left px-5 py-2 font-medium">{t('preview.description')}</th>
                <th className="text-right px-5 py-2 font-medium">{t('preview.value')}</th>
                <th className="text-left px-5 py-2 font-medium">{t('preview.units')}</th>
                <th className="text-left px-5 py-2 font-medium">{t('preview.refRange')}</th>
                <th className="text-left px-5 py-2 font-medium">{t('preview.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.observations.map((obs, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-5 py-2 font-mono text-xs text-gray-600">{obs.code}</td>
                  <td className="px-5 py-2 text-gray-900">{obs.text}</td>
                  <td className="px-5 py-2 text-right font-medium text-gray-900">{obs.value}</td>
                  <td className="px-5 py-2 text-gray-500">{obs.units || '—'}</td>
                  <td className="px-5 py-2 text-gray-500">{obs.refRange || '—'}</td>
                  <td className="px-5 py-2">{statusBadge(obs.mara_status, t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
