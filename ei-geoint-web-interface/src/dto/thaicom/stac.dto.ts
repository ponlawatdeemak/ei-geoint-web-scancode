import { Task } from '../../entities'

export class ServiceThaicomResponse {
  success: boolean
  data?: StacFeatureCollection | null
}

export class StacLink {
  rel: string
  type?: string
  href: string
  body?: {
    token?: string
  }
}

export class StacAsset {
  href: string
  // common fields
  format?: string
  type?: string
  roles?: string[]
  title?: string
  description?: string
  area_rai?: number
  color_code?: string
  rows?: number

  // projection / raster / eo extension common fields (kept permissive)
  'proj:shape'?: number[]
  'proj:transform'?: number[]
  'proj:epsg'?: number
  imaging_date?: string
  'raster:bands'?: unknown[]

  // tile extension
  'tile:bands'?: number[]
  'tile:format'?: string
  'tile:service'?: string;

  // allow additional fields
  [key: string]: unknown
}

export class StacGeometry {
  type: string
  // polygons, multipolygons, etc. use a permissive type to match STAC payloads
  coordinates: unknown
}

export class StacFeatureProperties {
  // common properties seen in samples
  task?: Task | null
  org_id?: string
  item_id?: string
  name?: string
  task_id?: string
  user_id?: string
  datetime?: string
  result_id?: string
  created_at?: string
  project_id?: string
  mission?: string
  imaging_date?: string
  input_item_ids?: string[]
  centroid_lat?: number
  centroid_lon?: number
  feature_count?: number
  feature_type?: string[]
  max_area?: number
  mean_area?: number
  min_area?: number
  total_area?: number
  total_length?: number
  vector_type?: string
  'proj:epsg'?: number
  'proj:shape'?: number[]
  child_items?: StacChildItem[]
  model_ids?: string[];
  // eo bands, file_counts, tile_service, processed, etc.
  [key: string]: unknown
}

export class StacChildItem {
  id: string
  href: string
  model_id: string
}

export class StacFeature {
  id: string
  type: string
  bbox?: number[]
  links?: StacLink[]
  assets?: Record<string, StacAsset>
  geometry?: StacGeometry
  collection?: string
  properties?: StacFeatureProperties
  stac_version?: string
  stac_extensions?: string[]
}

export class StacFeatureCollection {
  type: string
  links?: StacLink[]
  features: StacFeature[]
  numberMatched?: number
  numberReturned?: number
}
export class StacFeatureItem {
  date: string
  layer: StacLayerItem[]
}
export class StacLayerItem {
  id: string
  tile: {
    href: string
    type: string
    roles: string[]
    title: string
  }
  mapLayer: {
    [key: string]: {
      href: string
      type: string
      roles: string[]
      title: string
    }
  }
  download: string[]
  geometry: {
    type: string
    coordinates: unknown
  }
}

export class GetTaskTCDtoOut {
  data: StacFeatureCollection | null
}

export class GetImagesTCDtoOut {
  data: StacFeatureCollection | null
}

export class GetStacTCDtoOut {
  data: StacFeatureCollection | null
}
