import { useState, useCallback, useEffect, type RefObject } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { DisplayMode } from '@/components/layout/SearchWrapper'
import { ActiveView, type ProjectMapViewRef } from '@/components/shared/ProjectMapView'

interface UseTaskDisplayModeProps {
  projectMapViewRef: RefObject<ProjectMapViewRef | null>
  isLayerLoading: boolean
}

export const useTaskDisplayMode = ({ projectMapViewRef, isLayerLoading }: UseTaskDisplayModeProps) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const [shouldOpenWeekly, setShouldOpenWeekly] = useState(false)

  const isValidView = useCallback((v: string | null | undefined): v is DisplayMode => {
    return v === 'table' || v === 'card' || v === 'map'
  }, [])

  const initialView = (() => {
    const v = searchParams.get('view')
    return isValidView(v) ? v : 'card'
  })()

  const [displayMode, setDisplayMode] = useState<DisplayMode>(initialView)

  useEffect(() => {
    const v = searchParams.get('view')
    if (isValidView(v)) {
      if (v !== displayMode) setDisplayMode(v)
    } else if (displayMode !== 'card') {
      setDisplayMode('card')
    }
  }, [searchParams, displayMode, isValidView])

  const handleDisplayModeChange = useCallback(
    (mode: 'table' | 'card' | 'map') => {
      setDisplayMode(mode)
      const params = new URLSearchParams(Array.from(searchParams.entries()))
      if (mode === 'card') params.delete('view')
      else params.set('view', mode)
      const qs = params.toString()
      const url = qs ? `${pathname}?${qs}` : pathname
      router.replace(url)
    },
    [router, searchParams, pathname],
  )

  // Open weekly view when requested and map is ready
  useEffect(() => {
    if (!shouldOpenWeekly) return

    if (displayMode === 'map' && !isLayerLoading) {
      const timer = setTimeout(() => {
        if (projectMapViewRef.current) {
          projectMapViewRef.current.setActiveView(ActiveView.weekly)
          setShouldOpenWeekly(false)
        } else {
          console.log('Ref not ready yet, will retry on next render')
        }
      }, 50)

      return () => clearTimeout(timer)
    }
  }, [shouldOpenWeekly, displayMode, isLayerLoading, projectMapViewRef])

  return {
    displayMode,
    handleDisplayModeChange,
    shouldOpenWeekly,
    setShouldOpenWeekly,
  }
}
