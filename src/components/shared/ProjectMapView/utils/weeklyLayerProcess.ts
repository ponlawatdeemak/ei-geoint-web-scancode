import {
  LayerConfig,
  MapType,
  ProjectMapViewGroup,
  RootModelConfig,
  ServiceConfig,
  PostSearchLayersWeeklyDtoOut,
  TaskFeature,
  TaskLayer,
  ItvLayerType,
} from '@interfaces/index'
import type { Geometry } from 'geojson'
import { getColorByModelId } from '@/utils/color'

export interface ProcessedWeeklyData {
  groups: Record<string, ProjectMapViewGroup>
  allLayerConfigs: LayerConfig[]
  initialVisibility: Record<string, boolean>
  initialOpacity: Record<string, number>
  initialThresholds: Record<string, [number, number]>
  geometries: Geometry[]
}

/**
 * Processes weekly layer data into structured groups and layer configurations.
 * This function transforms raw layer data from the API into organized groups with
 * tile layers, vector layers, and heatmap layers.
 *
 * @param layerData - Raw layer data from weekly.postSearchLayers API
 * @param keyModelSelect - Array of selected model keys to filter layers
 * @returns Processed data including groups, configs, and initial states
 *
 * @example
 * ```typescript
 * const keyModelSelect = selectedModels.flatMap((m) => m.keys)
 * const result = processWeeklyLayers(layerData, keyModelSelect)
 * setLayerList(Object.values(result.groups))
 * setLayerVisibility(result.initialVisibility)
 * ```
 */
const processTileLayers = (
  layer: TaskLayer,
  groupId: string,
  groups: Record<string, ProjectMapViewGroup>,
  allLayerConfigs: LayerConfig[],
  initialVisibility: Record<string, boolean>,
  initialOpacity: Record<string, number>,
) => {
  if (!layer.tileLayers) return

  let inx = 1
  for (const tile of layer.tileLayers) {
    const tileId = `${groupId}-${tile.id}-tile`
    const tileConfig: LayerConfig = {
      type: MapType.tile,
      id: tileId,
      index: inx,
      template: tile.href,
      label: tile.title,
      geometry: (layer.geometry as Geometry) ?? null,
    }
    allLayerConfigs.push(tileConfig)
    groups[groupId].layerConfigs?.push(tileConfig)
    groups[groupId].layers.push({
      id: tileId,
      label: tile.title ?? '',
      color: '',
      type: MapType.tile,
      key: tile.model_id ?? 'tiles',
    })
    initialVisibility[tileId] = true
    initialOpacity[tileId] = 1
    inx += 1
  }
}

const processMapLayers = (
  layer: TaskLayer,
  groupId: string,
  groups: Record<string, ProjectMapViewGroup>,
  allLayerConfigs: LayerConfig[],
  initialVisibility: Record<string, boolean>,
  initialOpacity: Record<string, number>,
  initialThresholds: Record<string, [number, number]>,
  keyModelSelect: string[],
) => {
  if (!layer.mapLayers) return

  for (const mapLayer of layer.mapLayers) {
    const mapLayerId = mapLayer.id

    if (
      typeof mapLayerId === 'string' &&
      keyModelSelect.includes(mapLayer.model_id?.replace('-centroid_tile', '') || '')
    ) {
      const idParts = mapLayerId.split('-')
      const lastPart = idParts[idParts.length - 1]

      const fullMapLayerId = `${groupId}-${mapLayer.model_id}`
      const modelKey = mapLayer.model_id ?? ''
      const color = (mapLayer.color_code as string) ?? getColorByModelId(modelKey)
      const isHeatmap = lastPart === 'centroid_tile'

      const vectorConfig: LayerConfig = {
        type: isHeatmap ? MapType.heatmap : MapType.vector,
        id: fullMapLayerId,
        data: mapLayer.href ?? '',
        assetKey: modelKey,
        color_code: color,
        geometry: (layer.geometry ?? null) as Geometry | null,
      }

      allLayerConfigs.push(vectorConfig)
      groups[groupId].layerConfigs?.push(vectorConfig)

      if (!isHeatmap) {
        groups[groupId].layers.push({
          id: fullMapLayerId,
          label: (mapLayer.title as string) ?? modelKey,
          key: modelKey,
          color,
          type: MapType.vector,
          itemCount: (mapLayer.rows as number) ?? null,
          totalArea: undefined,
        })
        initialVisibility[fullMapLayerId] = true
        initialOpacity[fullMapLayerId] = 1
        initialThresholds[fullMapLayerId] = [0, 100]
      }
    }
  }
}

export const processWeeklyLayers = (
  layerData: PostSearchLayersWeeklyDtoOut,
  keyModelSelect: string[],
): ProcessedWeeklyData => {
  const groups: Record<string, ProjectMapViewGroup> = {}
  const allLayerConfigs: LayerConfig[] = []
  const initialVisibility: Record<string, boolean> = {}
  const initialOpacity: Record<string, number> = {}
  const initialThresholds: Record<string, [number, number]> = {}
  const geometries: Geometry[] = []

  layerData.features.forEach((feature: TaskFeature) => {
    feature.layer.forEach((layer: TaskLayer) => {
      geometries.push(layer.geometry as Geometry)

      const props = layer.properties ?? {}
      const groupName = (props.datetime as string) || layer.id
      const groupId = `weekly-${layer.id}`

      // Initialize group if not exists
      if (!groups[groupId]) {
        groups[groupId] = {
          groupId,
          groupName,
          projectId: 'projectId',
          serviceId: ServiceConfig.weekly,
          rootModelId: RootModelConfig.objectDetection,
          taskId: 'taskId',
          rootModelName: '',
          statusId: 0,
          layers: [],
          layerConfigs: [],
          layerType: ItvLayerType.TASK,
          itvLayerInfo: undefined,
          order: 0,
        }
      }

      processTileLayers(layer, groupId, groups, allLayerConfigs, initialVisibility, initialOpacity)
      processMapLayers(
        layer,
        groupId,
        groups,
        allLayerConfigs,
        initialVisibility,
        initialOpacity,
        initialThresholds,
        keyModelSelect,
      )
    })
  })

  return {
    groups,
    allLayerConfigs,
    initialVisibility,
    initialOpacity,
    initialThresholds,
    geometries,
  }
}
