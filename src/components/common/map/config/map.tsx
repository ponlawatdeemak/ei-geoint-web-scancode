import { LngLatBoundsLike } from 'react-map-gl/maplibre'

export interface BaseMap {
  value: BasemapType
  image: string
  label: string
}

export enum BasemapType {
  GoogleSatellite = 0,
  GoogleHybrid = 1,
  CartoLight = 2,
  CartoDark = 3,
}

export const layerIdConfig = {
  toolCurrentLocation: 'tool-current-layer',
  toolMeasurement: 'tool-measurement-layer',
  customReferer: 'custom-referer-layer',
  basicTools: 'basic-tools-layer',
}

export const thaiExtent: LngLatBoundsLike = [97.3758964376, 5.69138418215, 105.589038527, 20.4178496363]
