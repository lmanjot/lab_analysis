import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import de from './de.json'

function getInitialLanguage(): string {
  if (typeof window === 'undefined') return 'en'
  const params = new URLSearchParams(window.location.search)
  const locale = (params.get('locale') || '').toLowerCase()
  if (locale === 'de' || locale === 'en') return locale
  return 'en'
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      de: { translation: de },
    },
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
