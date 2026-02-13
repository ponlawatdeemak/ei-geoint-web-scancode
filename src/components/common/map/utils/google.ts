import { StyleSpecification } from 'maplibre-gl'

interface Session {
  expiry: string
  imageFormat: string
  session: string
  tileHeight: number
  tileWidth: number
}

interface SessionRequest {
  mapType: string
  language?: string // Optional property
  region?: string // Optional property
  scale: string
  highDpi: boolean
  layerTypes?: string[] // Optional property
  overlay?: boolean // Optional property
}
const sessions: Record<string, Promise<Session> | Session> = {}
const SESSION_KEY = 'google-session'

function isNeedCreateSession(session?: Promise<Session> | Session): boolean {
  if (session instanceof Promise) {
    return false
  }
  if (!session?.session) {
    return true
  }
  if (session.expiry) {
    const now = new Date().getTime()
    const expiry = Number(session.expiry) * 1000
    return now > expiry
  }
  return false
}

export async function googleProtocol(
  params: { url: string },
  abortController?: AbortController,
): Promise<{ data: ArrayBuffer }> {
  const url = new URL(params.url.replace('google://', 'https://'))
  const mapType = url.hostname
  const key = url.searchParams.get('key')
  const sessionKey = `${SESSION_KEY}-${mapType}`
  let value: Promise<Session> | Session | undefined =
    sessions[sessionKey] || JSON.parse(localStorage.getItem(sessionKey) || '{}')
  if (isNeedCreateSession(value)) {
    value = new Promise((resolve) => {
      const layerType = url.searchParams.get('layerType')
      const overlay = url.searchParams.get('overlay')

      const sessionRequest: SessionRequest = {
        mapType: 'satellite',
        language: 'en-US', // Default value
        region: 'US', // Default value
        scale: 'scaleFactor2x',
        highDpi: true,
        ...(mapType === 'hybrid'
          ? {
              layerTypes: ['layerRoadmap'],
            }
          : {}),
      }
      if (layerType) {
        sessionRequest.layerTypes = [layerType]
      }
      if (overlay) {
        sessionRequest.overlay = overlay === 'true'
      }
      const createSession = async () => {
        try {
          const response = await fetch(`https://tile.googleapis.com/v1/createSession?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sessionRequest),
            signal: abortController?.signal, // If abortController is provided, include it in the signal
          })

          if (!response.ok) {
            throw new Error(`Failed to create session: ${response.statusText}`)
          }

          const result = await response.json()
          localStorage.setItem(sessionKey, JSON.stringify(result))
          resolve(result)
        } catch (error) {
          console.error('Error creating session:', error)
          // Handle error appropriately (e.g., reject promise, throw exception)
        }
      }

      createSession()
    })
    sessions[sessionKey] = value // Store the promise while it's being fetched
  }
  const session = await value
  sessions[sessionKey] = session
  const tile = await fetch(
    `https://tile.googleapis.com/v1/2dtiles${url.pathname}?session=${session.session}&key=${key}`,
  )
  const data = await tile.arrayBuffer()
  return { data }
}

export function createGoogleStyle(id: string, mapType: 'satellite' | 'hybrid', key: string): StyleSpecification {
  const style: StyleSpecification = {
    version: 8,
    glyphs: '/maplibre-glyphs/{fontstack}/{range}.pbf',
    sources: {},
    layers: [
      {
        id,
        type: 'raster',
        source: id,
      },
    ],
  }
  style.sources[id] = {
    type: 'raster',
    tiles: [`google://${mapType}/{z}/{x}/{y}?key=${key}`],
    tileSize: 256,
    attribution: `© Google, Map data ©${new Date().getFullYear()} Google <a href="http://www.google.com/intl/en/policies/terms" target="_blank"><span> Terms </span></a> <a href="http://www.google.com/policies/privacy" target="_blank"><span> Privacy </span></a>`,
    maxzoom: 19,
  }
  return style
}
