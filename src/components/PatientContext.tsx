import { useTranslation } from 'react-i18next'
import { PatientContext as PatientContextType } from '../types'

interface PatientContextProps {
  value: PatientContextType
  onChange: (ctx: PatientContextType) => void
}

export default function PatientContext({ value, onChange }: PatientContextProps) {
  const { t } = useTranslation()

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('patient.title')}</h3>
      <p className="text-xs text-gray-500 mb-3">{t('patient.hint')}</p>
      <textarea
        value={value.medicalFormData || ''}
        onChange={(e) => onChange({ ...value, medicalFormData: e.target.value })}
        rows={6}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"
        placeholder={t('patient.placeholder')}
      />
    </div>
  )
}
