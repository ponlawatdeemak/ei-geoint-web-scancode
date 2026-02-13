import 'reflect-metadata'
import '@/styles/globals.css'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { fallbackLng } from '@/i18n/settings'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import Providers from '@/providers'
import theme from '@/styles/theme'
import { ThemeProvider } from '@mui/material/styles'
import { Prompt } from 'next/font/google'

const font = Prompt({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font',
})

export const metadata: Metadata = {
  title: 'IRIS',
  description: 'Intelligence Reconnaissance Insights System',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const lng = cookieStore.get('i18next')?.value || fallbackLng
  const nonce = cookieStore.get('csp-nonce')?.value || ''

  return (
    <html lang={lng}>
      <head>
        {/* SVG favicon for modern browsers (Chrome, Firefox, Edge) */}
        <link rel='icon' href='/images/logo_iris.svg' type='image/svg+xml' />
        {/* ICO fallback for Safari and older browsers */}
        <link rel='icon' href='/favicon.ico' sizes='32x32' type='image/x-icon' />
      </head>
      <body className={`${font.variable} antialiased`}>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <ThemeProvider theme={theme}>
            <Providers nonce={nonce}>
              <div className='flex h-full flex-1 flex-col bg-background'>{children}</div>
            </Providers>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  )
}
