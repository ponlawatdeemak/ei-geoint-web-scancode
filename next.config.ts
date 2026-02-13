import type { NextConfig } from 'next'
import packageJson from './package.json' with { type: 'json' }

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  env: {
    API_KEY: process.env.API_KEY,
    API_KEY_MAP: process.env.API_KEY_MAP,
    API_URL: process.env.API_URL,
    API_URL_MAP: process.env.API_URL_MAP,
    APP_VERSION: packageJson.version,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXT_PUBLIC_CONTACT_EMAIL: process.env.NEXT_PUBLIC_CONTACT_EMAIL,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_MAPTILER_API_KEY: process.env.NEXT_PUBLIC_MAPTILER_API_KEY,
    NEXT_PUBLIC_MAPTILER_DEM_URL: process.env.NEXT_PUBLIC_MAPTILER_DEM_URL,
    THAICOM_API_URL: process.env.THAICOM_API_URL,
    NEXT_PUBLIC_WSS_UPLOAD_URL: process.env.NEXT_PUBLIC_WSS_UPLOAD_URL,
  },
  images: {
    remotePatterns: [
      {
        // Local
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/thaicom-image-geotag/**',
      },
      {
        // QA MAPBOSS
        protocol: 'https',
        hostname: '*.app.mapboss.co.th',
        // hostname: 'chronos-api.app.mapboss.co.th',
        pathname: '/api/thaicom-image-geotag/**',
      },
      {
        // DEV THAICOM
        protocol: 'https',
        hostname: '*.thaicom.io',
        pathname: '/thaicom-image-geotag/**',
      },
      {
        protocol: 'https',
        hostname: '*.earthinsights.net',
        pathname: '/thaicom-image-geotag/**',
      },
      {
        protocol: 'https',
        hostname: '*.cloudfront.net', // Allows any subdomain, e.g., daaofj432k08z.cloudfront.net
        pathname: '/data/**',
      },
    ],
  },
}

export default nextConfig
