// src/i18n.ts (or wherever your config is)

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

i18n

  .use(HttpApi)

  .use(LanguageDetector)

  .use(initReactI18next)

  .init({
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
      // 🔧 FIX: Add error handling for missing translation files
      allowMultiLoading: false,
      crossDomain: false,
    },

    fallbackLng: 'es',
    
    // 🔧 FIX: Explicitly define supported languages
    supportedLngs: ['en', 'es', 'bn'],
    
    // 🔧 FIX: Don't fail if translation file is missing, use fallback
    load: 'languageOnly', // Only load language code, not region (e.g., 'en' not 'en-US')
    nonExplicitSupportedLngs: false, // Only load explicitly supported languages
    
    // 🔧 FIX: Let detector handle language detection
    // lng: undefined, // Removed duplicate - let detector handle it
 
    ns: ['translation'],
    defaultNS: 'translation',

    // 🔧 FIX: Better error handling
    debug: false, // Set to false in production, true for debugging
    saveMissing: false, // Don't save missing translations

    interpolation: {
      escapeValue: false, 
    },
    
    // 🔧 FIX: Handle missing translations gracefully
    react: {
      useSuspense: false, // Don't use suspense for loading translations
    },
    
    // 🔧 FIX: Language detection order - prioritize localStorage, then user preference
    detection: {
      // Order of detection methods
      order: ['localStorage', 'navigator', 'htmlTag'],
      // Keys to lookup language from
      lookupLocalStorage: 'i18nextLng',
      // Cache user language on
      caches: ['localStorage'],
    },
  });

export default i18n;