import { useLanguageStore, type Language } from '@/store/languageStore'

export const translations = {
  en: {
    nav: {
      dashboard: 'Dashboard',
      buildings_units: 'Buildings & Units',
      buildings_spaces: 'Buildings & Spaces',
      tenants: 'Tenants',
      companies: 'Companies',
      leases: 'Leases',
      leads: 'Leads',
      payments: 'Payments',
      invoices: 'Invoices',
      listings: 'Listings',
      maintenance: 'Maintenance',
      notifications: 'Notifications',
      reports: 'Reports',
      authentication: 'Authentication',
      settings: 'Settings',
    },
    groups: {
      portfolio: 'Portfolio Management',
      operations: 'Operations',
      financials: 'Financials',
      marketing: 'Marketing',
    },
    settings: {
      account: 'Account Settings',
      organization: 'Organization Settings',
      billing: 'Billing & Plans',
      sign_out: 'Sign Out',
      language: 'Language',
    },
    topnav: {
      profile: 'Profile',
      search: 'Search...',
      loading_org: 'Loading organization...',
    },
    common: {
      version: 'v1.0.0',
      en: 'English',
      fr: 'French',
    }
  },
  fr: {
    nav: {
      dashboard: 'Tableau de bord',
      buildings_units: 'Bâtiments et Unités',
      buildings_spaces: 'Bâtiments et Espaces',
      tenants: 'Locataires',
      companies: 'Entreprises',
      leases: 'Baux',
      leads: 'Prospects',
      payments: 'Paiements',
      invoices: 'Factures',
      listings: 'Annonces',
      maintenance: 'Maintenance',
      notifications: 'Notifications',
      reports: 'Rapports',
      settings: 'Paramètres',
    },
    groups: {
      portfolio: 'Gestion du Portefeuille',
      operations: 'Opérations',
      financials: 'Finances',
      marketing: 'Marketing',
    },
    settings: {
      account: 'Paramètres du compte',
      organization: 'Paramètres de l\'organisation',
      billing: 'Facturation et Plans',
      sign_out: 'Se déconnecter',
      language: 'Langue',
    },
    topnav: {
      profile: 'Profil',
      search: 'Rechercher...',
      loading_org: 'Chargement de l\'organisation...',
    },
    common: {
      version: 'v1.0.0',
      en: 'Anglais',
      fr: 'Français',
    }
  }
}

export type TranslationKeys = typeof translations.en

export function useTranslation() {
  const { language, setLanguage } = useLanguageStore()
  
  const t = translations[language as Language] || translations.en

  return { t, language, setLanguage }
}
