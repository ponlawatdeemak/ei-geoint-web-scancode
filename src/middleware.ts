import { NextResponse, NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { authPathPrefix, Roles } from '@interfaces/index'

export const config = {
  // Exclude _next/image, _next/static, and all media extensions except .txt and .xml
  matcher: [
    '/((?!_next/static|_next/image|.*\\.(?:ico|png|jpg|jpeg|svg|gif|webp|css|js|woff|woff2|ttf|eot)).*)',
    '/',
    '/(api|trpc)(.*)',
  ],
}

// Pre-generated hashes for inline styles (Emotion/MUI client-side injection)
const styleHashes = [
  'sha256-35A1/pwgLgN595SDWf5kr/ucDdu0+aqFuMYeBfNoalQ=',
  'sha256-afB/G/g130QM7E/dXMc5e2JQadDVQ8gEEqTgNRDV9lA=',
  'sha256-UP0QZg7irvSMvOBz9mH2PIIE28+57UiavRfeVea0l3g=',
  'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=',
  'sha256-tgZ3fni/+2+PuzoE6rJP/SIwz+7Upv3oDA15KtInCEc=',
  'sha256-PbpXm98imfa7wEIqow+T0DQFdT9EIRrp9nmGBbC8tfA=',
  'sha256-3hw8t0JD82luaV7OaGdt7JfC8Nh9v+2ELcOKg4QYBCA=',
  'sha256-tIWeTci4xCj6Rx5h5Gu+7oaazoCBi1YtDnjwNrO8gN0=',
  'sha256-VQSyrlBiWj2YW83jqaTD3o3J1RX/n9LR+CCf6PukRcE=',
  'sha256-cpJAYgzSUOtlB5E1gEXgMPFBBLQmrazzq/U1eLXp7i8=',
  'sha256-RYXZ7e70jAlrBmrEsOHw/KYe9AGItdx/MyeV+ZrRxf4=',
  'sha256-cZ2QLNrtWO7Cyn14lue/Ge2mpkCmBVJ9Jro85w0W9qc=',
  'sha256-v3h+GCe0QolypTD6anWafyq3t6okHpKjU9QbTAiQfqs=',
  'sha256-kMldrx9Byj0dj/EdLzAzFsWTlQp8en0t9ULceqboM0w=',
  'sha256-hjzBsdefmGEL3Wq2LeoSvH8quadFkGlZZ1RxVD0aCKg=',
  'sha256-JszimT9F5kzkpAOcRvI9+JwUSSh8LiXqrVIN8wk0x60=',
  'sha256-vcAPIwtkyGYAib9fqB9x2914jj8vt7smJqLhKeLMPYE=',
  'sha256-OhzvD91YiQjMPz449BPAoiIcAA34jqN5FQI98QbKPb8=',
  'sha256-xgcl3TM1V41Al4zPC3aF1zgmU289Y93sITGCxNlN78w=',
  'sha256-2WBy9xJamyvOLlcHMBflFtPlgfn7hiKoPO+LtpEB4IU=',
  'sha256-hZipTRQV/dnyDR9MIE2iY7q80UMEgcNMpeAiefegY/c=',
  'sha256-vMDUZsfQW3pHiHs5xomKD9iCv7w60/hAM6vx4TE1WtY=',
  'sha256-YO9yC82B7pmwFbciZ10MeKqOEwqxQSqyh+MmeS3LbKY=',
  'sha256-7+X7DQA/TxfF0oj5dpUqKm7t6h5sO5GCAwaOSEJGsEE=',
  'sha256-sHwQzC2ZsVrt1faUYCjF/eo8aIoBlQbGjVstzanL9CU=',
  'sha256-jsEp169jvFxdolAJPP6ut/EA6OZTxX+VyFmzI4bXYGs=',
  'sha256-sz6S8cfRhfIChTAYwba/l3rk4feQBhuiWdtQjb6AiF0=',
  'sha256-p2VjXaq/afEwXQAyI2IZo1pebx7mEHaMeOTNGwO+p7I=',
  'sha256-FMUprRSEaFFpM8ARuLPDDH3zeLUMZ7ROneEjo388GsM=',
  'sha256-p2VjXaq/afEwXQAyI2IZo1pebx7mEHaMeOTNGwO+p7I=',
  'sha256-s5HbhDUCx8DqDfbngK6bboED2Yq3hYq2VQGwuPMIfog=',
  'sha256-OyNV2hHkSynT5QKx3QiZzNc7CjiY0MW8JEquSRPEz+E=',
  'sha256-vOLcDQU4lDr18QogJNH85VmuCwfkNVZYnnJp5PV3Ry0=',
  'sha256-lo/VtTzYJU712ZqgvYoo4quub9GGgRtruDv7JXPGnok=',
  'sha256-fYiHlQV/Xkzu+fjxnU4AFsy2X70KP9/1GH69KLsNAVg=',
  'sha256-aelB2Ag9Y9rxyKaUn9ro2JSUOGIn21WsMkVExMb1DR4=',
  'sha256-HnQKhgg7HF2UtWsf5KYvBGtK4IAtKhoT4ThCN5O7G68=',
  'sha256-E0Zl8SMNoih9QQGYZvUNR7vqKoYXIxbNOXEsWMSqXMM=',
  'sha256-FzHzM6xtfhlZ9b8pa396iouFu1DUgSnGMJNRYg09zdc=',
  'sha256-okAmGyG+qhh4J2kXMT3KEurAf+HgLqhYo2eFVE+/ds4=',
  'sha256-9Y8sB/EP157SQ4m6IfqDBT5gH6ZxKnUXRZ4mCV7iXTs=',
  'sha256-4YXnylBNPn6NtwILuFPWGHLZWslTfFG0j5EI4jDIiCw=',
  'sha256-E/B7+e3ZMYNGd489tBrrVV96zNkd0Q9odZ/1S44tbnY=',
  'sha256-ZMscZVq2XSUqy4l28iOnxLcPnPoG6CpjkEBu7RA+n7E=',
  'sha256-/kUxLQaU+oPqjC7m6wcPBQ7Qr5Rhr6ukxQhKHTCo0A4=',
  'sha256-425t/KMRM55oJma7r1v7SuS3+D1IeKCxCzicBWs7j+g=',
  'sha256-kZMtULapeF+e/9MsffC6RMWZZSlErfTAA/+MXb+Dflc=',
  'sha256-FXHa1ncFDeKm3Zrf7uLbEeVamkObq7qyA3emwUQn0W0=',
  'sha256-DRWJCux/utZXvwkPCOLcekOPSDqTxf5Q3EleU60TDWg=',
  'sha256-NMxXwsr4em5igWiOFjZOSd9tfo6+gMpKzoFh7kb710U=',
  'sha256-ZESp4Y1HiXlghRXjOi0uwlEVAjfqfpiUnsW74Rvc0wg=',
  'sha256-Q7cv1GzgEpNFnFZV6WbE/Q5S5onOezH2XLO31FXT+tU=',
  'sha256-ZESp4Y1HiXlghRXjOi0uwlEVAjfqfpiUnsW74Rvc0wg=',
  'sha256-RR+v1YHOP3PMaI/tqPvHtGBUy9ZZgM0oQY9ULzeW77g=',
  'sha256-wr2nm2qvyDUI6ygCwsWCgqZSWaeEszoOstVDeweF8gM=',
  'sha256-e4ZTvH7F5GYslfqaLdzzrY7BpdqwIlpsJOH3hEf3PjA=',
  'sha256-BK8u1Dw03yt/P+SSLBWJczWVNWrWiuZy6BNMNqyT60s=',
  'sha256-+o4yXeOUc8/2HZgAG55/N8iJUXCKN0cPbmBUetyG3K8=',
  'sha256-uZbNUUFOnYSfqI9jzV2Gfux7ukJdBuTcsE4UH6phRo4=',
  'sha256-1OWiM/QA4DvZQ2O0+JAXCi2UxPZ5e9D9/fFWfNFfeZQ=',
  'sha256-IUIJDsIq35tSymsWuK2aWRvSB2micFxN75StMbuaDFA=',
  'sha256-O5l20LnPkWPji1vLnN+FO7zWTmIUTkez1n0TT4NXLcU=',
  'sha256-HaTYLv0bOjvQq65TTmybSp5Mk03EUbwNOl7dLCptXIY=',
  'sha256-4yzLD7yTrCgo80ve+NY6obsZVHssj6z00ppQVl4NWrk=',
  'sha256-ilYU4ePQUGr1S0P/6XbH2qBFRLSOOkY40ZlGHgLRgjU=',
  'sha256-21Ozs0EhL8DZf+3fJDfUpjmwpDX0Bd6zvtjG1oB2f1g=',
  'sha256-wr4uJkuQziG/op87fsFCrOi9saBkmcg58ypBQtHbRU8=',
  'sha256-mu+yG9Q3p8SF2H/OSiJ6Dz1aYd5vkh9j2SFdQeUtHV0=',
  'sha256-Cgr9wUrG5Z/h/FuywjDkNoRMhPiJBVShCl07DurUDaE=',
  'sha256-tWMbz2OTD4uGGya7g6UGNC8y7KTAg2gIYVhKMdI3Z9E=',
  'sha256-xQqeCr1kKV0oSmDvydNaotq5Hgaj9X6j6TFtZv7XHPc=',
  'sha256-YycrayqcHaFq9Blq1we79lyovPzWi23AE358bsOH550=',
  'sha256-0uiErPD/0l+o4qW52uYTdotmOXsLVkDnPednmt4XIdM=',
  'sha256-VDUriDAlxcQiOd2sQaVyqHkbwrOklBZeOusHi6k42bg=',
  'sha256-9gCRW2UtxL0stQrRKGobD3I7rEcLiiBuJKZmPPhwEAg=',
  'sha256-d4YFtuiWE1P4kRqXztAjQ/vHBu5Dcq3XdDKZ1+Neafo=',
  'sha256-1jID/qPaN4aGeFxS18+SyZv6oSn113Mxh9sKimaz0GQ=',
  'sha256-YllXFN52l56jC8YxWNw/MO2symwWk6j+wzgd89G1gJc=',
  'sha256-LwCk7bdtw1b66k9EAVI6//QxZ9RzLvaN86JTiZ7/ssk=',
  'sha256-bbyNTo4nlA6hLLCpAAWr1OXeHlPbyJ68KO0jdFi+bv8=',
  'sha256-P1/Mgh/ZsagGQXogiMYxADg/ha/z7XCd8cpz8bJtxe0=',
  'sha256-Nq9SvSU0hw8+HVREIwEBvHYO1xuJIO7ILwCfeWsminU=',
  'sha256-0zqoDBwDCsqnCdab24IDw/HullozPppA0qoB1IUjuto=',
  'sha256-jr2vE2FtxN9AapJl/dkXru6m4XGotOYWXLvkOwANS3I=',
  'sha256-vXchHSDMJTWSiIbLTksA9FPra36QrZqd2SHFsJcPMmE=',
  'sha256-FxtXNjVmVJ53EJ6SWMBQxuuMRO+BD3yho2pxZ5J9FAA=',
  'sha256-eORaFVXZsmu6jB040CVNO0YHye6AfpqkhrHyUTDyzLU=',
  'sha256-MBIwHUuqr4u08U1VITDMAWgzsb6uFnxr0bH+L8hXyiY=',
  'sha256-Rbui0pJ1Fyr5h03yKr9O1qtXCSLMs3lJe5fRp2pzprg=',
  'sha256-XWoBpnNY8bG3mWNGcenRtLtQLAnRNavHhteStsod4MM=',
  'sha256-jFUBZ2GWLr0rFk92NuhodrgeNXN1kd1kB7TVexpqZjs=',
  'sha256-7uVdqv9L/ivBH9sszsIwgrUMf6wCrM+iQ4iCEGiePqs=',
  'sha256-lccxffh2Xln67HhlouYgXsZXEtWxWSTrNI+RMUzJipA=',
  'sha256-JsisxXtmZTXuQArxmsHsNbG3MjvU4sdFlAMvk8GfQ/U=',
  'sha256-MQ6jHuvlAJlJny5J4tQt9dBgIhg26sphVPNqtHbJRp0=',
  'sha256-iMt8v++L5XICczoBD4jKW1C1FBlzjZ3UaT2kiYHMg0w=',
  'sha256-pIcWpO5d8HuIohCBXuGVCXaMtTf5jZ1XjVCja+8jyKA=',
  'sha256-Bpw5Ryz/tVpZEC7KuCn966csirzgXoFScOkduhSkFyY=',
  'sha256-CMoaiTl6hRi/M3NHw7dWCP77fUI/G1r/+vKAc6K+FBc=',
  'sha256-uavS73Z0mOmB36AGmfILZ0vInWNpqKy64qzNV9dOrwc=',
  'sha256-SRhQkCx5gJuZ6JBUYRE8z9QAwcXdINE9SDahn4OGgNQ=',
  'sha256-A51T85ATjhdUuTvHChUWHLG95YffrGu4xzolUDqEvKY=',
  'sha256-tvfNPmEvU7vMqiUYNiPBA8EdS4Jq3jABWVYvzCs8GCw=',
  'sha256-FrJRcm8sSywDP6iadPyBgjKhLBqddoIoHrkcWBmR+Co=',

  // LayerControls
  'sha256-fIOx+SVAiSkJNJOc75g+HDsZAzHGuyxeS9jI4wwWzvs=',
  'sha256-E0Zl8SMNoih9QQGYZvUNR7vqKoYXIxbNOXEsWMSqXMM=',
  'sha256-fIOx+SVAiSkJNJOc75g+HDsZAzHGuyxeS9jI4wwWzvs=',
  'sha256-kZMtULapeF+e/9MsffC6RMWZZSlErfTAA/+MXb+Dflc=',

  // ProjectMapView/index
  'sha256-BN5erOJ6k3+785pWcbfw2G4sAO8O0T8eWjtVuMXVLEo=',
  'sha256-Qb5rkU7w4gRbyCKSALT62BnWY9mAV083/2Px8Au3bgU=',
  'sha256-/wJmSePBiR4Sj69gCal+ywTKDr2hXVmtsVgo3Z7ufIc=',
  'sha256-kr/gGNh1LTtrKwrCJZGhg0aCf9OIMWhrHauaQvhk24Y=',
  'sha256-/wJmSePBiR4Sj69gCal+ywTKDr2hXVmtsVgo3Z7ufIc=',
  'sha256-/SuqFFeExu5APsXnhK+eULeCSkiJbLWy7YTXKIFnQEQ=',
  'sha256-ebHzl9LQajvcz3UGiFGniwzSnplk9aKt9nTI22jDhVI=',
  'sha256-gXxjdiYSZwwhWXu6tDWrAfllm65l3vLpk8SeNrPJkYA=',
  'sha256-RR5bZAbtprw9QaChJzw/vYL4UtHmk0xoZk+UDLjC43g=',

  // useCreateMapThumbnail
  'sha256-/wJmSePBiR4Sj69gCal+ywTKDr2hXVmtsVgo3Z7ufIc=',
  'sha256-2v93LLymG/A1+HmPNvgwf6HqWiNfWp8lbEJwcHxTmWM=',
  'sha256-yBwDm4Dez5qts5ou7DzISrPdFRRfZsHvTaAMELgXOHg=',

  // Other
  'sha256-E7FpU8dAxY9jiajAS6O9oRfQ5GzDP2CZQDwbqeFFtR0=',
  'sha256-E0Zl8SMNoih9QQGYZvUNR7vqKoYXIxbNOXEsWMSqXMM=',

  // dognut chart
  'sha256-AiG1arqmrvLVNfU2KdkGQAkX7kFY+F/CnipcaSdooXM=',
  'sha256-9c/X1XEfklsEqhv2sbmcHfarB4B5ZqQRHzDj8zsJ6aI=',
  'sha256-utcjSNsrLvghdVmiTb32QyL/7B3zPveVVrlSZ0J4eXk=',
  'sha256-imowdJiKtCrejAuaW2IdKJS7NwN5zsFhwxrts+QTZuU=',
  'sha256-fVU67Hs9AhjRiq8YSPGEeI0ViXUB8Jd8B5FsRjzZmPM='
]

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

  // --- CSP: Generate nonce ---
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  // --- CSP: Read API URLs from environment (extract origin only, no path) ---
  const getOrigin = (url?: string) => {
    try {
      return url ? new URL(url).origin : ''
    } catch {
      return url ?? ''
    }
  }
  const apiOrigin = getOrigin(process.env.API_URL)
  const mapApiOrigin = getOrigin(process.env.API_URL_MAP)
  const thaicomApiOrigin = getOrigin(process.env.THAICOM_API_URL)
  const wssUploadOrigin = getOrigin(process.env.NEXT_PUBLIC_WSS_UPLOAD_URL)
  const styleHashesString = styleHashes.map((h) => `'${h}'`).join(' ')

  const cspDirectives = [
    `default-src 'self' ${apiOrigin} ${mapApiOrigin} ${thaicomApiOrigin}`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}' ${styleHashesString}`,
    `style-src-elem 'self' 'nonce-${nonce}' ${styleHashesString}`,
    `style-src-attr 'self' ${styleHashesString}`,
    `img-src 'self' blob: data: ${apiOrigin} ${mapApiOrigin} ${thaicomApiOrigin} https://tile.googleapis.com https://mt1.google.com https://tile.openstreetmap.org https://api.maptiler.com https://basemaps.cartocdn.com https://iris-ap-southeast-7-811478435729.s3.ap-southeast-7.amazonaws.com`,
    `font-src 'self' https://fonts.gstatic.com data:`,
    `connect-src 'self' ${apiOrigin} ${mapApiOrigin} ${thaicomApiOrigin} ${wssUploadOrigin} https://tile.googleapis.com https://places.googleapis.com https://mt1.google.com https://api.maptiler.com https://tile.openstreetmap.org https://basemaps.cartocdn.com https://tiles.basemaps.cartocdn.com https://tiles-a.basemaps.cartocdn.com https://tiles-b.basemaps.cartocdn.com https://tiles-c.basemaps.cartocdn.com https://tiles-d.basemaps.cartocdn.com https://iris-ap-southeast-7-811478435729.s3.ap-southeast-7.amazonaws.com ${process.env.NODE_ENV === 'development' ? process.env.NEXTAUTH_URL : ''}`,
    `worker-src 'self' blob:`,
    `frame-src 'self'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'self'`,
    `object-src 'none'`,
    ...(process.env.NODE_ENV === 'production' ? [`upgrade-insecure-requests`] : []),
  ]

  const cspHeader = cspDirectives.join('; ')

  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', cspHeader)

  // Helper: attach CSP header + nonce cookie to any response
  function applyCSP(response: NextResponse) {
    response.headers.set('Content-Security-Policy', cspHeader)
    response.cookies.set('csp-nonce', nonce, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    })
    // Also set nonce in request headers so Server Components can read it
    response.headers.set('x-nonce', nonce)
    return response
  }

  // Special debug for auth callback credentials
  if (
    pathname === '/api/auth/callback/credentials' &&
    req.method === 'POST' &&
    process.env.MIDDLEWARE_DEBUG === 'true'
  ) {
    console.log('🔐 [MIDDLEWARE] Detected POST /api/auth/callback/credentials')
    console.log('🔐 [MIDDLEWARE] Request headers:', Object.fromEntries(req.headers.entries()))
    try {
      await req.clone().text()
    } catch (error) {
      console.log('🔐 [MIDDLEWARE] Could not read request body:', error)
    }
  }

  // Fetch token once
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  // กรณี reset password ให้เข้าถึงได้เสมอ
  if (pathname === resetPasswordPath || pathname.startsWith(`${resetPasswordPath}/`)) {
    return applyCSP(NextResponse.next({ request: { headers: requestHeaders } }))
  }
  console.log('🔧 [MIDDLEWARE] Token exists:', !!token)
  console.log('🔧 [MIDDLEWARE] User role:', token?.roleId || 'No role')
  console.log('🔧 [MIDDLEWARE] User email:', token?.email || 'No email')

  // Prevent logged-in users from accessing /auth/*
  const isAuthPath = pathname === authPathPrefix || pathname.startsWith(`${authPathPrefix}/`)
  console.log('🔧 [MIDDLEWARE] Is auth path:', isAuthPath)

  if (isAuthPath && token) {
    console.log('🔧 [MIDDLEWARE] Redirecting logged-in user away from auth path')
    return applyCSP(NextResponse.redirect(new URL('/profile', origin)))
  }

  // Define public paths
  const isPublic = publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  console.log('🔧 [MIDDLEWARE] Is public path:', isPublic)
  console.log('🔧 [MIDDLEWARE] Checked against public paths:', publicPaths)

  if (isPublic) {
    console.log('🔧 [MIDDLEWARE] Allowing access to public path')
    return applyCSP(NextResponse.next({ request: { headers: requestHeaders } }))
  }

  if (!token) {
    const loginUrl = new URL(loginPath, origin)
    console.log('🔧 [MIDDLEWARE] No token found, redirecting to login:', loginUrl.toString())
    return applyCSP(NextResponse.redirect(loginUrl))
  }

  // Role-based route protection
  return handleRoleBasedAccess(token, pathname, origin, applyCSP, requestHeaders)
}

function handleRoleBasedAccess(
  token: { roleId?: unknown },
  pathname: string,
  origin: string,
  applyCSP: (response: NextResponse) => NextResponse,
  requestHeaders: Headers,
) {
  const allowedPaths = protectedPaths[token.roleId as keyof typeof protectedPaths]
  const allProtectedPaths = Object.values(protectedPaths).flat()
  const pathExists = allProtectedPaths.some((p) => pathname.includes(p))

  if (pathExists) {
    if (allowedPaths && !allowedPaths.some((p) => pathname.includes(p))) {
      return applyCSP(NextResponse.redirect(new URL('/error/unauthorized', origin)))
    }
  } else {
    return applyCSP(NextResponse.redirect(new URL('/project', origin)))
  }

  console.log('🔧 [MIDDLEWARE] Access granted - continuing to requested path')
  return applyCSP(NextResponse.next({ request: { headers: requestHeaders } }))
}
