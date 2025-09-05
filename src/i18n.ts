// src/i18n.ts

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";

i18n
  // Use HttpBackend to load translations from your public folder
  .use(HttpBackend)
  
  // Detect user language
  .use(LanguageDetector)
  
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  
  // Initialize i18next
  .init({
    // Set a default language in case detection fails
    fallbackLng: "en",
    
    // Enable debug messages in the console during development
    debug: true,

    backend: {
      loadPath: '/locales/{{lng}}/translation.json',
    },

    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;