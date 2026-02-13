declare module '@maplibre/maplibre-gl-compare' {
  import type { Map } from 'maplibre-gl'

  export interface CompareOptions {
    orientation?: 'vertical' | 'horizontal'
    mousemove?: boolean
  }

  export default class MaplibreCompare {
    constructor(before: Map, after: Map, container?: string | HTMLElement, options?: CompareOptions)
    remove(): void
  }
}
