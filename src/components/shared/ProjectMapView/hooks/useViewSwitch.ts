import { useEffect, type ReactNode } from 'react'
import type maplibregl from 'maplibre-gl'
import { ActiveView } from '../index'
import { ProjectMapViewPageLevel, type ProjectMapViewGroup } from '@interfaces/index'

export function useViewSwitch(params: {
  activeView: ActiveView
  pageLevel: ProjectMapViewPageLevel
  mapId: string
  mapLibre: Record<string, maplibregl.Map | null>
  setWeeklyOverlay: (v: ReactNode | null) => void
  setIsPanelOpen: (v: boolean) => void
  setSelectedGroup: (v: ProjectMapViewGroup | null) => void
}) {
  const { activeView, pageLevel, mapId, mapLibre, setWeeklyOverlay, setIsPanelOpen, setSelectedGroup } = params

  // remove heat layers when leaving weekly
  useEffect(() => {
    if (activeView !== ActiveView.weekly && pageLevel === ProjectMapViewPageLevel.project) {
      const map = mapLibre[mapId]
      if (!map) return

      const mapLayers = map.getStyle()?.layers || []
      mapLayers.forEach((layer: { id: string }) => {
        const layerIdParts = layer.id.split('-')
        const lastPart = layerIdParts[layerIdParts.length - 1]
        if (lastPart === 'heat') {
          try {
            map.removeLayer(layer.id)
            map.removeSource(layer.id)
          } catch {
            // ignore
          }
        }
      })
    }
  }, [mapLibre, mapId, activeView, pageLevel])

  // weekly view switch
  useEffect(() => {
    if (activeView !== ActiveView.weekly) {
      setWeeklyOverlay(null)
    } else {
      setIsPanelOpen(false)
      setSelectedGroup(null)
    }
  }, [activeView, setWeeklyOverlay, setIsPanelOpen, setSelectedGroup])
}
