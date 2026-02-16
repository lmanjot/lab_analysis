import { useTranslation } from 'react-i18next'

export default function AnalysisView() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-6">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-900">{t('input.analyzing')}</h2>
        <p className="text-sm text-gray-500 mt-1">
          {t('app.subtitle')}
        </p>
      </div>
    </div>
  )
}
