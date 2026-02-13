import type { Geometry } from 'geojson'
import { DefaultAoiColor } from '@interfaces/config/color.config'
import { MapType, MapArea, ProjectMapViewGroup, TaskLayer, ItvLayerType, LayerConfig } from '@interfaces/index'
import { ItvLayer } from '@interfaces/entities'
import { vectorArrayToFeatureCollection } from './itvConvertor'
import { getColorByModelId } from '@/utils/color'

export function buildAreaFromMapLayer(mapLayer: Record<string, unknown>): MapArea {
  return {
    rai: (mapLayer.area_rai as number) ?? null,
    sqm: (mapLayer.area_sqm as number) ?? null,
    sqkm: (mapLayer.area_sqkm as number) ?? null,
    acre: (mapLayer.area_acre as number) ?? null,
    hectare: (mapLayer.area_hectare as number) ?? null,
    sqmile: (mapLayer.area_sqmile as number) ?? null,
    sqnauticmile: (mapLayer.area_sqnauticmile as number) ?? null,
  }
}

export function processMapLayers(layer: TaskLayer, groups: Record<string, ProjectMapViewGroup>) {
  if (!layer.mapLayers) return

  const props = (layer.properties ?? {}) as Record<string, unknown>
  const task = (props.task ?? {}) as Record<string, unknown>
  const groupId = `${task.id}-${task.thaicomTaskId}`

  for (const mapLayer of layer.mapLayers) {
    const mapLayerId = `${groupId}-${mapLayer.model_id}`
    const modelKey = mapLayer.model_id ?? ''
    const color = (mapLayer.color_code as string) ?? getColorByModelId(modelKey)
    const totalArea = buildAreaFromMapLayer(mapLayer as Record<string, unknown>)

    if (!groups[groupId].rootModelName && modelKey) {
      groups[groupId].rootModelName = modelKey.split('-')[0]
    }

    groups[groupId].layers.push({
      id: mapLayerId,
      label: (mapLayer.title as string) ?? modelKey,
      key: modelKey,
      color,
      type: MapType.vector,
      itemCount: (mapLayer.rows as number) ?? null,
      totalArea,
    })

    groups[groupId].layerConfigs?.push({
      type: MapType.vector,
      id: mapLayerId,
      data: mapLayer.href ?? '',
      assetKey: modelKey,
      color_code: color,
      geometry: (layer.geometry ?? null) as Geometry | null,
    })
  }
}

export function processGeoJsonLayers(layer: TaskLayer, groups: Record<string, ProjectMapViewGroup>) {
  if (!layer.geoJsonLayers) return

  const props = (layer.properties ?? {}) as Record<string, unknown>
  const task = (props.task ?? {}) as Record<string, unknown>
  const groupId = `${task.id}-${task.thaicomTaskId}`

  for (const geoJsonLayer of layer.geoJsonLayers) {
    const geoJsonLayerId = `${groupId}-${geoJsonLayer.id}`
    const modelKey = geoJsonLayer.model_id ?? ''

    groups[groupId].layers.push({
      id: geoJsonLayerId,
      label: geoJsonLayer.title ?? modelKey,
      color: DefaultAoiColor,
      type: MapType.geojson,
      key: modelKey ?? 'aoi',
    })

    groups[groupId].layerConfigs?.push({
      type: MapType.geojson,
      id: geoJsonLayerId,
      data: geoJsonLayer.data ?? '',
      label: geoJsonLayer.title ?? modelKey,
      assetKey: modelKey,
      color_code: DefaultAoiColor,
      geometry: geoJsonLayer.geometry ?? null,
    })
  }
}

export function processTileLayers(
  layer: TaskLayer,
  groups: Record<string, ProjectMapViewGroup>,
  getImageTitle: (task: Record<string, unknown> | undefined, itemId: string) => string,
) {
  if (!layer.tileLayers) return

  const props = (layer.properties ?? {}) as Record<string, unknown>
  const task = (props.task ?? {}) as Record<string, unknown>
  const groupId = `${task.id}-${task.thaicomTaskId}`
  let inx = 1

  for (const tile of layer.tileLayers) {
    const tileId = `${groupId}-${tile.id}-${inx}-tile`
    const label = getImageTitle(task, tile.id ?? '')

    groups[groupId].layers.push({
      id: tileId,
      label: tile.title ?? label,
      color: '',
      type: MapType.tile,
      key: tile.model_id ?? 'tiles',
    })

    groups[groupId].layerConfigs?.push({
      type: MapType.tile,
      id: tileId,
      index: inx,
      template: tile.href,
      label: tile.title ?? label,
      geometry: (tile.geometry ?? layer.geometry ?? null) as Geometry | null,
      bands: tile['tile:bands'] as number[],
      bandsCount: tile['eo:bands_count'] as number,
      imageType: tile['image_type'] as number,
      colormapName: tile['tile:colormap_name'] as string,
    })
    inx += 1
  }
}

export function processItvLayer(layer: ItvLayer, groups: Record<string, ProjectMapViewGroup>) {
  if (!layer) return

  const groupId = `itv-${layer.id}`

  const mapTypeFor = (lt: string | undefined) => {
    if (lt === ItvLayerType.VECTOR) return MapType.itvVector
    if (lt === ItvLayerType.PHOTO) return MapType.itvPhoto
    if (lt === ItvLayerType.RASTER_TILE) return MapType.itvRasterTile
    if (lt === ItvLayerType.VECTOR_TILE) return MapType.itvVectorTile
    if (lt === ItvLayerType.GALLERY) return MapType.itvGallery
    if (lt === ItvLayerType.DRAW) return MapType.itvDraw
    return MapType.itvAnnotation
  }

  const layerEntry = {
    id: layer.id,
    label: layer.name ?? layer.id,
    color: DefaultAoiColor,
    type: mapTypeFor(layer.layerType),
    key: layer.id,
  }

  const layerConfigs: LayerConfig[] = []
  if (
    layer.layerType === ItvLayerType.VECTOR ||
    layer.layerType === ItvLayerType.DRAW ||
    layer.layerType === ItvLayerType.PHOTO
  ) {
    let mapType: MapType
    if (layer.layerType === ItvLayerType.VECTOR) {
      mapType = MapType.itvVector
    } else if (layer.layerType === ItvLayerType.PHOTO) {
      mapType = MapType.itvPhoto
    } else {
      mapType = MapType.itvDraw
    }
    layerConfigs.push({
      type: mapType,
      id: layer.id,
      label: layer.name,
      assetKey: layer.id,
      color_code: DefaultAoiColor,
      geometry: null,
      data: layer.features?.length > 0 ? vectorArrayToFeatureCollection(layer.features) : null,
    })
  } else if (layer.layerType === ItvLayerType.RASTER_TILE) {
    layerConfigs.push({
      type: MapType.itvRasterTile,
      id: layer.id,
      label: layer.name,
      geometry: null,
      template: layer.url,
      index: 0,
    })
  } else if (layer.layerType === ItvLayerType.VECTOR_TILE) {
    layerConfigs.push({
      type: MapType.itvVectorTile,
      label: layer.name,
      id: layer.id,
      data: layer.url,
      assetKey: layer.id,
      color_code: undefined,
      geometry: null,
    })
  } else if (layer.layerType === ItvLayerType.GALLERY) {
    layerConfigs.push({
      type: MapType.itvGallery,
      id: layer.id,
      label: layer.name,
      geometry: layer.image?.geometry ?? null,
      template: layer.image?.tileUrl,
      image: layer.image ?? null,
      index: 0,
    })
  } else if (layer.layerType === ItvLayerType.ANNOTATION) {
    layerConfigs.push({
      type: MapType.itvAnnotation,
      id: layer.id,
      label: layer.name,
      geometry: null,
      data: null,
      features: layer.features,
    })
  }

  groups[groupId] = {
    groupId,
    groupName: layer.name,
    projectId: layer.projectId,
    serviceId: undefined,
    rootModelId: undefined,
    taskId: undefined,
    rootModelName: undefined,
    statusId: undefined,
    layers: [layerEntry],
    layerConfigs,
    download: undefined,
    layerType: layer.layerType,
    order: Number(layer.order) || 0,
    itvLayerInfo: layer,
  }
}
