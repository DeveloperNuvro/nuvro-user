// src/i18n.ts (or wherever your config is)

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

i18n
  // i18next-http-backend: loads translations from your server
  .use(HttpApi)
  // detect user language
  .use(LanguageDetector)
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  .init({
    // THE MOST IMPORTANT PART: This tells i18next where to find the files.
    // It matches the URL we tested in Step 1.
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    // Set a fallback language
    fallbackLng: 'en',
    
    // Set the default namespace
    ns: ['translation'],
    defaultNS: 'translation',

    // Enable debug mode to see detailed logs in the console
    debug: true, // <--- VERY IMPORTANT FOR DEBUGGING

    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
  });

export default i18n;