// src/i18n.ts

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";

i18n
  
  .use(HttpBackend)
  

  .use(LanguageDetector)
  
  
  .use(initReactI18next)
  

  .init({
   
    fallbackLng: "es",
    
   
    debug: true,

    backend: {
      loadPath: '/locales/{{lng}}/translation.json',
    },

    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;