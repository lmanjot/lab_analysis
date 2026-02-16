import { useTranslation } from 'react-i18next'
import { PatientContext as PatientContextType } from '../types'

interface PatientContextProps {
  value: PatientContextType
  onChange: (ctx: PatientContextType) => void
}

export default function PatientContext({ value, onChange }: PatientContextProps) {
  const { t } = useTranslation()

  const update = (field: keyof PatientContextType, val: string) => {
    onChange({ ...value, [field]: val })
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('patient.title')}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('patient.age')}</label>
          <input
            type="number"
            value={value.age || ''}
            onChange={(e) => update('age', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="35"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('patient.sex')}</label>
          <select
            value={value.sex || ''}
            onChange={(e) => update('sex', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="">—</option>
            <option value="male">{t('patient.sexMale')}</option>
            <option value="female">{t('patient.sexFemale')}</option>
            <option value="other">{t('patient.sexOther')}</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('patient.weight')}</label>
          <input
            type="number"
            value={value.weight || ''}
            onChange={(e) => update('weight', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="75"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('patient.height')}</label>
          <input
            type="number"
            value={value.height || ''}
            onChange={(e) => update('height', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="175"
          />
        </div>
      </div>
      <div className="mt-4">
        <label className="block text-xs font-medium text-gray-500 mb-1">{t('patient.conditions')}</label>
        <input
          type="text"
          value={value.conditions || ''}
          onChange={(e) => update('conditions', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          placeholder={t('patient.conditionsPlaceholder')}
        />
      </div>
    </div>
  )
}
