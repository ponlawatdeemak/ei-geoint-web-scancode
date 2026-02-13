import * as Yup from 'yup'
import i18next from '@/i18n/i18next'

export function setYupCommonLocale() {
  Yup.setLocale({
    mixed: {
      required: () => i18next.t('validation.required'),
    },
    string: {
      email: () => i18next.t('validation.invalidEmail'),
      min: ({ min }) => i18next.t('validation.minLength', { count: min }),
      max: ({ max }) => i18next.t('validation.maxLength', { count: max }),
    },
    number: {
      min: ({ min }) => i18next.t('validation.minNumber', { count: min }),
      max: ({ max }) => i18next.t('validation.maxNumber', { count: max }),
    },
    array: {
      min: ({ min }) => i18next.t('validation.minArrayLength', { count: min }),
      max: ({ max }) => i18next.t('validation.maxArrayLength', { count: max }),
    },
  })
}

// initialize once
setYupCommonLocale()

// update whenever language changes
i18next.on('languageChanged', () => {
  setYupCommonLocale()
})
