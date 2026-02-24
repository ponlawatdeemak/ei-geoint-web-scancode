'use client'

import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { create } from 'zustand'

export const languageFlags = {
  th: '/icons/flag_th.svg',
  en: '/icons/flag_uk.svg',
}

export type Settings = {
  language: string
  areaUnit: string
  lengthUnit: string
  sidebarCollapsed?: boolean
  copyLocationType?: string
}

const SETTINGS_KEY = 'app_settings'

const defaultSettings: Settings = {
  language: 'th',
  areaUnit: 'sqkm',
  lengthUnit: 'km',
  sidebarCollapsed: false,
  copyLocationType: 'DD',
}

function loadSettings(): Settings {
  if (globalThis.window !== undefined) {
    const stored = globalThis.localStorage.getItem(SETTINGS_KEY)
    if (stored) return { ...defaultSettings, ...JSON.parse(stored) }
  }
  return defaultSettings
}

type SettingsStore = Settings & {
  setLanguage: (language: string) => void
  setAreaUnit: (areaUnit: string) => void
  setLengthUnit: (lengthUnit: string) => void
  setSidebarCollapsed: (sidebarCollapsed: boolean) => void
  setCopyLocationType: (copyLocationType: string) => void
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...loadSettings(),
  setLanguage: (language) => {
    set((state) => {
      const next = { ...state, language }
      if (globalThis.window !== undefined) {
        globalThis.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
      }
      return next
    })
  },
  setAreaUnit: (areaUnit) => {
    set((state) => {
      const next = { ...state, areaUnit }
      if (globalThis.window !== undefined) {
        globalThis.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
      }
      return next
    })
  },
  setLengthUnit: (lengthUnit) => {
    set((state) => {
      const next = { ...state, lengthUnit }
      if (globalThis.window !== undefined) {
        globalThis.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
      }
      return next
    })
  },
  setSidebarCollapsed: (sidebarCollapsed) => {
    set((state) => {
      const next = { ...state, sidebarCollapsed }
      if (globalThis.window !== undefined) {
        globalThis.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
      }
      return next
    })
  },
  setCopyLocationType: (copyLocationType) => {
    set((state) => {
      const next = { ...state, copyLocationType }
      if (globalThis.window !== undefined) {
        globalThis.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
      }
      return next
    })
  },
}))

export function useSettings() {
  const { i18n } = useTranslation('common')
  const language = useSettingsStore((s) => s.language)
  const areaUnit = useSettingsStore((s) => s.areaUnit)
  const lengthUnit = useSettingsStore((s) => s.lengthUnit)
  const sidebarCollapsed = useSettingsStore((s) => s.sidebarCollapsed)
  const setLanguage = useSettingsStore((s) => s.setLanguage)
  const setAreaUnit = useSettingsStore((s) => s.setAreaUnit)
  const setLengthUnit = useSettingsStore((s) => s.setLengthUnit)
  const setSidebarCollapsed = useSettingsStore((s) => s.setSidebarCollapsed)

  // Sync i18n language
  const setLanguageAndI18n = useCallback(
    (lang: string) => {
      setLanguage(lang)
      i18n.changeLanguage(lang)
    },
    [setLanguage, i18n],
  )

  // On first mount ensure i18n uses the stored language from the settings store.
  // This handles the case where the app reloads and the store is initialized from
  // localStorage but i18n hasn't been updated yet.
  useEffect(() => {
    if (language && i18n.language !== language) {
      // changeLanguage may return a promise or undefined. Wrap with
      // Promise.resolve so we always have a Promise and can safely attach
      // a .catch handler without conditional checks.
      Promise.resolve(i18n.changeLanguage(language)).catch(() => {
        /* ignore errors during initial sync */
      })
    }
    // We only want this to run on mount or when stored language changes.
  }, [language, i18n])

  return {
    language,
    areaUnit,
    lengthUnit,
    sidebarCollapsed,
    copyLocationType: useSettingsStore((s) => s.copyLocationType),
    setLanguage: setLanguageAndI18n,
    setAreaUnit,
    setLengthUnit,
    setSidebarCollapsed,
    setCopyLocationType: useSettingsStore((s) => s.setCopyLocationType),
  }
}
