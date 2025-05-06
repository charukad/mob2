import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translations
import enTranslation from './translations/en.json';
import siTranslation from './translations/si.json';
import taTranslation from './translations/ta.json';

// Initialize i18next
i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources: {
      en: {
        translation: enTranslation
      },
      si: {
        translation: siTranslation
      },
      ta: {
        translation: taTranslation
      }
    },
    lng: 'en', // default language
    fallbackLng: 'en', // use English if current language translation not available
    
    interpolation: {
      escapeValue: false // react already safes from xss
    },
    
    // React options
    react: {
      useSuspense: false
    }
  });

export default i18n;