import { useCallback, useEffect, useRef, useMemo } from 'react'
import type maplibregl from 'maplibre-gl'
import createMapLibreLayersFromConfig, { CreatedMapLibreLayers } from '../utils/maplibreLayerCreator'
import { LayerConfig, MapType } from '@interfaces/index'
import useMapStore from '@/components/common/map/store/map'
import { layerIdConfig } from '@/components/common/map/config/map'

export function useMapLibreLayers(params: {
  mapId: string
  mapLibre: Record<string, maplibregl.Map | null>
  layerList: { layerConfigs?: LayerConfig[] }[]
  thresholds: Record<string, [number, number]>
  layerVisibility: Record<string, boolean>
  getFeatureConfidence: (feature: { properties?: Record<string, unknown> } | null) => number
  handleFeatureClick: (lngLat: [number, number] | undefined, object: Record<string, unknown> | null) => void
}) {
  const { mapId, mapLibre, layerList, thresholds, layerVisibility, getFeatureConfidence, handleFeatureClick } = params

  const createdLayersRef = useRef<Map<string, CreatedMapLibreLayers>>(new Map())
  const layerConfigHashRef = useRef<Map<string, string>>(new Map()) // Store config hash to detect changes
  const thresholdsRef = useRef(thresholds)
  const visibilityRef = useRef(layerVisibility)
  const prevOrderRef = useRef<string[]>([])
  const map = useMemo(() => mapLibre[mapId], [mapLibre, mapId])

  useEffect(() => {
    thresholdsRef.current = thresholds
  }, [thresholds])

  useEffect(() => {
    visibilityRef.current = layerVisibility
  }, [layerVisibility])

  const collectAndSortConfigs = useCallback((layers: { layerConfigs?: LayerConfig[] }[]): LayerConfig[] => {
    const allLayer: LayerConfig[] = []
    const ly = [...layers].reverse()

    for (const g of ly) {
      const lyConfig = [...(g.layerConfigs ?? [])].reverse()
      for (const cfg of lyConfig as LayerConfig[]) {
        // if (cfg.type === MapType.tile) tile.push(cfg)
        // else if (cfg.type === MapType.geojson) geojson.push(cfg)
        // else vector.push(cfg)

        allLayer.push(cfg)
      }
    }
    return allLayer
  }, [])

  // Reorder existing layers to match desired config order without full rebuild
  const reorderLayers = useCallback((map: maplibregl.Map, orderedConfigs: LayerConfig[]) => {
    const anchorId = layerIdConfig.customReferer
    const hasAnchor = !!map.getLayer(anchorId)

    for (const cfg of orderedConfigs) {
      const created = createdLayersRef.current.get(cfg.id)
      if (!created) continue
      for (const lid of created.layerIds) {
        if (!map.getLayer(lid)) continue
        try {
          // Place each layer just before the anchor to preserve ordering across configs
          if (hasAnchor) {
            map.moveLayer(lid, anchorId)
          } else {
            map.moveLayer(lid)
          }
        } catch {
          // ignore move errors
        }
      }
    }
  }, [])

  const createNewLayers = useCallback(
    (allConfigs: LayerConfig[], map: maplibregl.Map) => {
      for (const cfg of allConfigs) {
        const layerId = cfg.id
        const configHash = JSON.stringify(cfg)
        const existingHash = layerConfigHashRef.current.get(layerId)

        // If layer exists but config changed, force re-create
        if (createdLayersRef.current.has(layerId) && existingHash !== configHash) {
          const oldLayer = createdLayersRef.current.get(layerId)
          oldLayer?.cleanup()
          createdLayersRef.current.delete(layerId)
          layerConfigHashRef.current.delete(layerId)
        }

        // Create layer if it doesn't exist
        if (!createdLayersRef.current.has(layerId)) {
          try {
            const created = createMapLibreLayersFromConfig(cfg, {
              map,
              thresholds,
              layerVisibility,
              getFeatureConfidence,
              getClickInfo: handleFeatureClick,
            })
            if (created) {
              createdLayersRef.current.set(layerId, created)
              layerConfigHashRef.current.set(layerId, configHash)
            }
          } catch (error) {
            console.error(`Failed to create layer ${layerId}:`, error)
            // Continue with next layer instead of throwing
          }
        }
      }
    },
    [thresholds, layerVisibility, getFeatureConfidence, handleFeatureClick],
  )

  const cleanupRemovedLayers = useCallback((configIds: Set<string>) => {
    for (const [layerId, created] of createdLayersRef.current.entries()) {
      if (!configIds.has(layerId)) {
        created.cleanup()
        createdLayersRef.current.delete(layerId)
        layerConfigHashRef.current.delete(layerId) // Also remove hash
      }
    }
  }, [])

  const findConfigIdForLayer = useCallback(
    (firstLayerId: string): string => {
      for (const g of layerList) {
        const found = (g.layerConfigs ?? []).find((cfg) => firstLayerId.startsWith(cfg.id))
        if (found) return found.id
      }
      return ''
    },
    [layerList],
  )

  const updateLayerVisibility = useCallback(
    (map: maplibregl.Map, created: CreatedMapLibreLayers, configId: string) => {
      const isVisible = layerVisibility[configId] ?? true
      for (const lid of created.layerIds) {
        const layer = map.getLayer(lid)
        if (layer) {
          map.setLayoutProperty(lid, 'visibility', isVisible ? 'visible' : 'none')
        }
      }
    },
    [layerVisibility],
  )

  const updateVectorLayerFilters = useCallback(
    (map: maplibregl.Map, created: CreatedMapLibreLayers, configId: string, configType: string) => {
      if (configType !== MapType.vector) return

      const th = thresholds[configId] ?? [0, 100]
      const [minTh, maxTh] = th

      const confExpr: maplibregl.ExpressionSpecification = [
        'coalesce',
        ['get', 'confidence'],
        ['get', 'confidence_mean'],
        ['get', 'condidence'],
        1,
      ]
      const filter: maplibregl.ExpressionSpecification = [
        'all',
        ['>=', confExpr, minTh / 100],
        ['<=', confExpr, maxTh / 100],
      ]

      for (const lid of created.layerIds) {
        if (lid.includes('fill') || lid.includes('line') || lid.includes('point')) {
          try {
            map.setFilter(lid, filter)
          } catch {
            // ignore unsupported
          }
        }
      }
    },
    [thresholds],
  )

  const findConfigForLayer = useCallback(
    (firstLayerId: string): { configId: string; configType: string } => {
      for (const g of layerList) {
        const cfg = (g.layerConfigs ?? []).find((c) => firstLayerId.startsWith(c.id))
        if (cfg) {
          return { configId: cfg.id, configType: cfg.type }
        }
      }
      return { configId: '', configType: '' }
    },
    [layerList],
  )

  // create & cleanup layers when configs change
  useEffect(() => {
    if (!map) return

    const allConfigs = collectAndSortConfigs(layerList)
    createNewLayers(allConfigs, map)
    cleanupRemovedLayers(new Set(allConfigs.map((c) => c.id)))

    // Detect and apply order changes without full rebuild
    const currentOrder = allConfigs.map((c) => c.id)
    const prevOrder = prevOrderRef.current
    const orderChanged = currentOrder.length !== prevOrder.length || currentOrder.some((id, i) => id !== prevOrder[i])

    // Always reorder if we created/updated layers or if order changed
    // This fixes the issue where updating a single layer (e.g. band change) pushes it to top
    // Fix from thaicom: only reorder if there are created layers
    if (createdLayersRef.current.size > 0) {
      reorderLayers(map, allConfigs)
    }

    if (orderChanged || prevOrder.length === 0) {
      prevOrderRef.current = currentOrder
    }
  }, [map, layerList, collectAndSortConfigs, createNewLayers, cleanupRemovedLayers, reorderLayers])

  // update visibility when layerVisibility changes
  useEffect(() => {
    if (!map) return

    for (const created of createdLayersRef.current.values()) {
      const firstLayerId = created.layerIds[0]
      if (!firstLayerId) continue

      const configId = findConfigIdForLayer(firstLayerId)
      if (!configId) continue

      updateLayerVisibility(map, created, configId)
    }
  }, [map, findConfigIdForLayer, updateLayerVisibility])

  // update filters when thresholds change
  useEffect(() => {
    if (!map) return

    for (const created of createdLayersRef.current.values()) {
      const firstLayerId = created.layerIds[0]
      if (!firstLayerId) continue

      const { configId, configType } = findConfigForLayer(firstLayerId)
      if (!configId) continue

      updateVectorLayerFilters(map, created, configId, configType)
    }
  }, [map, findConfigForLayer, updateVectorLayerFilters])

  // re-apply visibility and filters after style reload (basemap change)
  // biome-ignore lint/correctness/useExhaustiveDependencies: IGNORE mapId
  useEffect(() => {
    if (!map) return

    const handlerId = `apply-layer-state-${mapId}`
    const registerHandler = useMapStore.getState().registerStyleDataHandler
    const unregisterHandler = useMapStore.getState().unregisterStyleDataHandler

    const handler = (m: maplibregl.Map) => {
      for (const created of createdLayersRef.current.values()) {
        const firstLayerId = created.layerIds[0]
        if (!firstLayerId) continue

        const { configId, configType } = findConfigForLayer(firstLayerId)
        if (!configId) continue

        // apply visibility from latest ref
        const isVisible = visibilityRef.current[configId] ?? true
        for (const lid of created.layerIds) {
          if (m.getLayer(lid)) {
            try {
              m.setLayoutProperty(lid, 'visibility', isVisible ? 'visible' : 'none')
            } catch {}
          }
        }

        // apply filters for vector layers from latest thresholds
        if (configType === MapType.vector) {
          const [minTh, maxTh] = thresholdsRef.current[configId] ?? [0, 100]
          const confExpr: maplibregl.ExpressionSpecification = [
            'coalesce',
            ['get', 'confidence'],
            ['get', 'confidence_mean'],
            1,
          ]
          const filter: maplibregl.ExpressionSpecification = [
            'all',
            ['>=', confExpr, minTh / 100],
            ['<=', confExpr, maxTh / 100],
          ]
          for (const lid of created.layerIds) {
            if (lid.includes('fill') || lid.includes('line') || lid.includes('point')) {
              try {
                if (m.getLayer(lid)) m.setFilter(lid, filter)
              } catch {}
            }
          }
        }
      }
    }

    registerHandler(map, handlerId, handler)
    return () => unregisterHandler(map, handlerId)
  }, [map, findConfigForLayer])

  // cleanup on unmount
  useEffect(() => {
    return () => {
      for (const created of createdLayersRef.current.values()) {
        created.cleanup()
      }
      createdLayersRef.current.clear()
      layerConfigHashRef.current.clear() // Clear hash map too
    }
  }, [])

  return { createdLayersRef }
}
