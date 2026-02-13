import { NextResponse, NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { authPathPrefix, Roles } from '@interfaces/index'

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}

// Debug: Log the matcher configuration
console.log('🔧 [MIDDLEWARE CONFIG] Matcher patterns:', config.matcher)

const loginPath = '/auth/login'
const publicPaths = ['/error', '/auth', '/api/auth']
const resetPasswordPath = '/auth/reset-' + 'pwd'
const commonProtectedPaths = ['/project', '/gallery', '/profile', '/user', '/data-management', '/playground']
const protectedPaths = {
  [Roles.superAdmin]: [...commonProtectedPaths, '/subscription', '/organization', '/api'],
  [Roles.admin]: [...commonProtectedPaths, '/subscription', '/organization', '/api'],
  [Roles.customerAdmin]: [...commonProtectedPaths, '/api'],
  [Roles.user]: [...commonProtectedPaths, '/api'],
  [Roles.viewer]: [...commonProtectedPaths],
}

export async function middleware(req: NextRequest) {
  const { pathname, origin } = req.nextUrl

  console.log('🔧 [MIDDLEWARE] Starting middleware for:', pathname)
  console.log('🔧 [MIDDLEWARE] Origin:', origin)
  console.log('🔧 [MIDDLEWARE] Method:', req.method)

  // Special debug for auth callback credentials
  if (
    pathname === '/api/auth/callback/credentials' &&
    req.method === 'POST' &&
    process.env.MIDDLEWARE_DEBUG === 'true'
  ) {
    console.log('🔐 [MIDDLEWARE] Detected POST /api/auth/callback/credentials')
    console.log('🔐 [MIDDLEWARE] Request headers:', Object.fromEntries(req.headers.entries()))
    try {
      const body = await req.clone().text()
      // console.log('🔐 [MIDDLEWARE] Request body:', body)
    } catch (error) {
      console.log('🔐 [MIDDLEWARE] Could not read request body:', error)
    }
  }

  // Fetch token once
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  // กรณี reset password ให้เข้าถึงได้เสมอ
  const isResetPassword = pathname === resetPasswordPath || pathname.startsWith(`${resetPasswordPath}/`)
  if (isResetPassword) {
    return NextResponse.next()
  }
  console.log('🔧 [MIDDLEWARE] Token exists:', !!token)
  console.log('🔧 [MIDDLEWARE] User role:', token?.roleId || 'No role')
  console.log('🔧 [MIDDLEWARE] User email:', token?.email || 'No email')

  // Prevent logged-in users from accessing /auth/*
  const isAuthPath = pathname === authPathPrefix || pathname.startsWith(`${authPathPrefix}/`)
  console.log('🔧 [MIDDLEWARE] Is auth path:', isAuthPath)

  if (isAuthPath && token) {
    console.log('🔧 [MIDDLEWARE] Redirecting logged-in user away from auth path')
    return NextResponse.redirect(new URL('/profile', origin))
  }

  // Define public paths
  const isPublic = publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  console.log('🔧 [MIDDLEWARE] Is public path:', isPublic)
  console.log('🔧 [MIDDLEWARE] Checked against public paths:', publicPaths)

  if (isPublic) {
    console.log('🔧 [MIDDLEWARE] Allowing access to public path')
    return NextResponse.next()
  }

  // Helper to redirect to login with callback
  function redirectToLogin() {
    // const callbackParam = isAuthPath || pathname === '/' ? '' : `?callbackUrl=${encodeURIComponent(pathname)}`
    const callbackParam = ''
    const loginUrl = new URL(`${loginPath}${callbackParam}`, origin)
    console.log('🔧 [MIDDLEWARE] Redirecting to login:', loginUrl.toString())
    return NextResponse.redirect(loginUrl)
  }

  if (!token) {
    console.log('🔧 [MIDDLEWARE] No token found, redirecting to login')
    return redirectToLogin()
  }

  // Role-based route protection
  const allowedPaths = protectedPaths[token.roleId as keyof typeof protectedPaths]

  // Check if the path exists in any role's protected paths
  const allProtectedPaths = Object.values(protectedPaths).flat()
  const pathExists = allProtectedPaths.some((p) => pathname.includes(p))

  if (pathExists) {
    if (allowedPaths && !allowedPaths.some((p) => pathname.includes(p))) {
      return NextResponse.redirect(new URL('/error/unauthorized', origin))
    }
  } else {
    return NextResponse.redirect(new URL('/project', origin))
  }

  // All other protected routes: allow if authenticated
  console.log('🔧 [MIDDLEWARE] Access granted - continuing to requested path')
  return NextResponse.next()
}
