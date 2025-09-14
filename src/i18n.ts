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
    },

    fallbackLng: 'es',
 
    ns: ['translation'],
    defaultNS: 'translation',


    debug: true, 

    interpolation: {
      escapeValue: false, 
    },
  });

export default i18n;