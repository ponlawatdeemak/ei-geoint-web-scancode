// แปลง ITV array เป็น GeoJSON.FeatureCollection
import { ItvFeatureProperties } from '@interfaces/entities'
import type { FeatureCollection, Feature, Geometry, Point } from 'geojson'

export interface ItvFeatureGroup extends ItvFeatureProperties {
  childList: ItvFeatureProperties[]
}

export function vectorArrayToFeatureCollection(input: any[]): FeatureCollection {
  const featureWithGroup = itvPhotoGroup(input)
  return {
    type: 'FeatureCollection',
    features: featureWithGroup.map((item) => ({
      type: 'Feature',
      geometry: item.geometry,
      properties: { ...item },
      id: item.id,
    })) as Feature<Geometry>[],
  }
}

export const itvPhotoGroup = (featureList: ItvFeatureProperties[]): ItvFeatureGroup[] => {
  let result: ItvFeatureGroup[] = []
  if (featureList && featureList.length > 0) {
    const photoWithGeometry: ItvFeatureProperties[] = []
    const groupStore = featureList.reduce(
      (acc: any, row: ItvFeatureProperties) => {
        if (row.photoGroupId) {
          acc[row.photoGroupId] = acc[row.photoGroupId] || []
          acc[row.photoGroupId].push({ ...row })
        } else if (row.geometry) {
          photoWithGeometry.push({ ...row })
        }
        return acc
      },
      {} as Record<string, ItvFeatureProperties[]>,
    )

    const groupList = Object.keys(groupStore).map((row) => {
      return {
        id: row,
        photoGroupId: row,
        childList: groupStore[row],
        geometry: groupStore[row][0]?.geometry as Point,
        createdAt: groupStore[row][0]?.createdAt,
      }
    })
    const formatList = [...photoWithGeometry, ...groupList]
    result = formatList as ItvFeatureGroup[]
  }
  return result
}
