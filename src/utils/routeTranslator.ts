// src/utils/routeTranslator.ts

// This object maps the hardcoded 'label' string to its i18next key.
export const labelToKeyMap: { [key: string]: string } = {
  "Overview": "sidebar.labels.overview",
  "Inbox": "sidebar.labels.inbox",
  "Channel": "sidebar.labels.channel",
  "Human Agent": "sidebar.labels.humanAgent",
  "Ticket": "sidebar.labels.ticket",
  "AI Model": "sidebar.labels.aiModel",
  "AI Agent": "sidebar.labels.aiAgent",
  "Customers": "sidebar.labels.customers",
  "Analytics": "sidebar.labels.analytics",
  "Reporting": "sidebar.labels.reporting",
  "Workflows": "sidebar.labels.workflows",
  "Plan & Payment": "sidebar.labels.planAndPayment",
  "Settings": "sidebar.labels.settings",
  "Log Out": "sidebar.labels.logOut",
};

// This object maps the hardcoded 'section' string to its i18next key.
export const sectionToKeyMap: { [key: string]: string } = {
  "Main Menu": "sidebar.sections.mainMenu",
  "Business": "sidebar.sections.business",
  "Account": "sidebar.sections.account",
};