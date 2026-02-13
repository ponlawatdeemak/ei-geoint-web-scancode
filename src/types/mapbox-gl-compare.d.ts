declare module 'mapbox-gl-compare' {
  import type { Map } from 'maplibre-gl'

  interface CompareOptions {
    orientation?: 'vertical' | 'horizontal'
    mousemove?: boolean
  }

  export default class MapboxCompare {
    constructor(
      before: Map,
      after: Map,
      container?: string | HTMLElement,
      options?: CompareOptions
    )
    remove(): void
  }
}