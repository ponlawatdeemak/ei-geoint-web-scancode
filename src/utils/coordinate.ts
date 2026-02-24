import * as mgrs from 'mgrs'
import proj4 from 'proj4'

export type CoordSystem = 'DD' | 'UTM47' | 'UTM48' | 'MGRS'

export const utm47 = '+proj=utm +zone=47 +datum=WGS84 +units=m +no_defs'
export const utm48 = '+proj=utm +zone=48 +datum=WGS84 +units=m +no_defs'
export const wgs84 = '+proj=longlat +datum=WGS84 +no_defs'

export const COORD_UNITS: { label: string; value: CoordSystem }[] = [
  { label: 'GCS', value: 'DD' },
  { label: 'WGS 1984 UTM 47', value: 'UTM47' },
  { label: 'WGS 1984 UTM 48', value: 'UTM48' },
  { label: 'MGRS', value: 'MGRS' },
]

export function fromDecimalDegree(lng: number, lat: number, to: CoordSystem): string {
  if (to === 'DD') {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  } else if (to === 'UTM47' || to === 'UTM48') {
    const utmProj = to === 'UTM47' ? utm47 : utm48
    const [easting, northing] = proj4(wgs84, utmProj, [lng, lat])
    return `${easting.toFixed(6)}, ${northing.toFixed(6)}`
  } else if (to === 'MGRS') {
    return mgrs.forward([lng, lat], 5)
  }
  return ''
}
