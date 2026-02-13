'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PropsWithChildren, Suspense } from 'react'
import { I18nextProvider } from 'react-i18next'

import createCache from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import { CssBaseline } from '@mui/material'

import { CookiesProvider } from 'react-cookie'
import { GlobalUIProvider } from './global-ui/GlobalUIContext'
import NextAuthSessionProvider from './NextAuthSessionProvider'
import i18next from '@/i18n/i18next'
import TokenProvider from './TokenProvider'

interface ProvidersProps extends PropsWithChildren {
  nonce: string
}

const Providers: React.FC<ProvidersProps> = ({ children, nonce }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: false, // not retry when error
        refetchInterval: 60000 * 30, // refetch every 30 minutes
      },
    },
  })

  const cache = createCache({
    key: 'csp-nonce',
    nonce: nonce,
    prepend: true,
  })

  return (
    <QueryClientProvider client={queryClient}>
      <CssBaseline />
      <CacheProvider value={cache}>
        <CookiesProvider>
          <I18nextProvider i18n={i18next}>
            <NextAuthSessionProvider>
              <GlobalUIProvider>
                <Suspense>
                  <TokenProvider>{children}</TokenProvider>
                </Suspense>
              </GlobalUIProvider>
            </NextAuthSessionProvider>
          </I18nextProvider>
        </CookiesProvider>
      </CacheProvider>
    </QueryClientProvider>
  )
}

export default Providers
