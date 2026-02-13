import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import type { NextAuthOptions } from 'next-auth'
import service from '@/api'
import { PostConfirmOtpLoginDtoOut } from '@interfaces/index'
import { JWT } from 'next-auth/jwt'
import { UserSession } from '@/types/next-auth'
declare module 'next-auth' {
  interface User {
    id?: string
    roleId?: number
  }
}
declare module 'next-auth/jwt' {
  interface JWT {
    roleId?: number
  }
}

const parseJwt = (token: string) => {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours in seconds
  },
  pages: {
    signIn: '/auth/login',
  },
  debug: process.env.MIDDLEWARE_DEBUG === 'true', // Enable debug in development or when middleware_debug=true
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {},
      authorize(credentials) {
        if (process.env.MIDDLEWARE_DEBUG === 'true') {
          console.log('🔐 [AUTH CALLBACK] POST /api/auth/callback/credentials - Starting authorization')
          console.log('🔐 [AUTH CALLBACK] Received credentials keys:', Object.keys(credentials || {}))
        }

        try {
          const { userId, roleId, accessToken, refreshToken } = credentials as PostConfirmOtpLoginDtoOut

          if (process.env.MIDDLEWARE_DEBUG === 'true') {
            console.log('🔐 [AUTH CALLBACK] Parsed credentials:')
            console.log('🔐 [AUTH CALLBACK] - userId:', userId)
            console.log('🔐 [AUTH CALLBACK] - roleId:', roleId)
            console.log('🔐 [AUTH CALLBACK] - accessToken exists:', !!accessToken)
            console.log('🔐 [AUTH CALLBACK] - refreshToken exists:', !!refreshToken)
          }

          if (userId && accessToken && refreshToken) {
            if (process.env.MIDDLEWARE_DEBUG === 'true') {
              console.log('🔐 [AUTH CALLBACK] Authorization successful - returning user object')
            }
            return {
              id: userId,
              roleId,
              accessToken,
              refreshToken,
            }
          }

          if (process.env.MIDDLEWARE_DEBUG === 'true') {
            console.log('🔐 [AUTH CALLBACK] Authorization failed - missing required fields')
          }
          return null
        } catch (error) {
          if (process.env.MIDDLEWARE_DEBUG === 'true') {
            console.log('🔐 [AUTH CALLBACK] Authorization error:', error)
          }
          throw new Error(JSON.stringify(error))
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, session, trigger }) {
      if (process.env.MIDDLEWARE_DEBUG === 'true') {
        console.log('🔐 [JWT CALLBACK] Processing JWT callback')
        console.log('🔐 [JWT CALLBACK] Trigger:', trigger)
        console.log('🔐 [JWT CALLBACK] User exists:', !!user)
        console.log('🔐 [JWT CALLBACK] Token ID:', token?.id)
      }

      delete token.error
      if (trigger === 'update' && session) {
        if (process.env.MIDDLEWARE_DEBUG === 'true') {
          console.log('🔐 [JWT CALLBACK] Updating token with session data')
        }
        // เมื่อมีการแก้ไข profile ต้องเอาค่าจาก session เข้าไปด้วย
        return { ...token, ...user, ...session } as JWT
      }

      const accessToken = token?.accessToken
      const jwtToken = { ...token, ...user }

      if (process.env.MIDDLEWARE_DEBUG === 'true') {
        console.log('🔐 [JWT CALLBACK] Access token exists:', !!accessToken)
      }

      if (accessToken) {
        try {
          const data = parseJwt(accessToken)
          const expiredTime = data?.exp
          const currentTime = Math.floor(Date.now() / 1000)

          if (process.env.MIDDLEWARE_DEBUG === 'true') {
            console.log('🔐 [JWT CALLBACK] Token expiry time:', new Date(expiredTime * 1000).toISOString())
            console.log('🔐 [JWT CALLBACK] Current time:', new Date(currentTime * 1000).toISOString())
            console.log('🔐 [JWT CALLBACK] Token expired:', currentTime >= expiredTime)
          }

          if (currentTime >= expiredTime) {
            // Refresh using this user's refresh token (do NOT use process-global state)
            try {
              const refreshed = await service.auth.refreshToken({
                accessToken: token.accessToken ?? '',
                refreshToken: token.refreshToken ?? '',
              })
              if (refreshed?.accessToken) jwtToken.accessToken = refreshed.accessToken
            } catch (err) {
              console.log('next-auth refresh token failed for user:', err)
              jwtToken.error = 'RefreshAccessTokenError'
            }
          }
        } catch (error) {
          console.log('next-auth refreshAccessToken RefreshAccessTokenError error:', error)
          jwtToken.error = 'RefreshAccessTokenError'
        }
      }
      return jwtToken as JWT
    },
    session({ session, token }) {
      if (process.env.MIDDLEWARE_DEBUG === 'true') {
        console.log('🔐 [SESSION CALLBACK] Processing session callback')
        console.log('🔐 [SESSION CALLBACK] Token ID:', token?.id)
        console.log('🔐 [SESSION CALLBACK] Token error:', token?.error)
      }

      const { error, ...user } = token
      if (error) {
        if (process.env.MIDDLEWARE_DEBUG === 'true') {
          console.log('🔐 [SESSION CALLBACK] Error in token, clearing session:', error)
        }
        session.error = error
        session.user = null as unknown as UserSession
      } else {
        // Do NOT update server-global access token here. Client-side TokenProvider
        // will push accessToken into client axios defaults when needed.
        session.user = user as UserSession
      }

      if (process.env.MIDDLEWARE_DEBUG === 'true') {
        console.log('🔐 [SESSION CALLBACK] Final session user ID:', session.user?.id)
      }
      return session
    },
  },
}

const handler = NextAuth(authOptions)

// Conditionally wrap handler with debug logging if MIDDLEWARE_DEBUG=true
const createHandler = () => {
  if (process.env.MIDDLEWARE_DEBUG === 'true') {
    console.log('🔐 [NEXTAUTH] Debug handler enabled via MIDDLEWARE_DEBUG=true')

    const debugHandler = async (req: Request, context: any) => {
      const url = new URL(req.url)
      const pathname = url.pathname

      console.log('🔐 [NEXTAUTH HANDLER] Request received:', {
        method: req.method,
        pathname: pathname,
        timestamp: new Date().toISOString(),
      })

      // Special logging for credentials callback
      if (pathname.includes('/callback/credentials')) {
        console.log('🔐 [NEXTAUTH HANDLER] Request method:', req.method)
        console.log('🔐 [NEXTAUTH HANDLER] Full URL:', req.url)

        if (req.method === 'POST') {
          try {
            const body = await req.clone().text()
            console.log('🔐 [NEXTAUTH HANDLER] POST body length:', body.length)
            // Log first 200 chars to avoid too much output
            console.log('🔐 [NEXTAUTH HANDLER] POST body preview:', body.substring(0, 200) + '...')
          } catch (error) {
            console.log('🔐 [NEXTAUTH HANDLER] Could not read body:', error)
          }
        }
      }

      // Call the original handler
      const response = await handler(req, context)

      console.log('🔐 [NEXTAUTH HANDLER] Response status:', response.status)
      return response
    }

    return debugHandler
  } else {
    console.log('🔐 [NEXTAUTH] Using standard handler (MIDDLEWARE_DEBUG not enabled)')
    return handler
  }
}

const exportHandler = createHandler()

export { exportHandler as GET, exportHandler as POST }
