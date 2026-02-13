import { TaskFeature, TaskLayer, TaskMapLayerItem } from '@interfaces/dto/tasks'
import { AreaItem, ModelItem } from '../weekly/store/useWeeklyMapStore'
import { formatNumber, LOCALE_STRING_OPTIONS } from '@/utils/formatNumber'
import { CheckWeeklyChangeDetection, CheckWeeklyObjectDetection } from '@interfaces/config'

/**
 * Groups model keys based on selected areas and models, aligning with the logic in `useWeeklyMapStore`.
 * @param selectedAreas - Array of selected area objects.
 * @param selectedModels - Array of selected model objects.
 * @returns An object containing arrays of areaKeys, collectionKeys, and modelKeys.
 */
export const getGroupedKeys = (selectedAreas: AreaItem[], selectedModels: ModelItem[]) => {
  const selectedAreaIds = new Set(selectedAreas.map((a) => a.id))
  const areaKeys = selectedAreas.map((a) => a.key)
  const collectionKeys: string[] = []
  const modelKeys: string[] = []

  selectedModels.forEach((m) => {
    if (m.modelType === 'collection') {
      const filteredKeys = m.keySources.filter((ks) => selectedAreaIds.has(ks.parentAreaId)).map((ks) => ks.key)
      collectionKeys.push(...filteredKeys)
    } else {
      // For child models, keys are included if their parent collection is selected.
      // The filtering happens at the collection level.
      modelKeys.push(...m.keys)
    }
  })

  return { areaKeys, collectionKeys, modelKeys }
}

export const txtModel = (row: TaskFeature, selectedModels: ModelItem[]) => {
  if (!row) return { changeDetection: null, objectDetection: null }

  const keyModelSelect = selectedModels.flatMap((m) => m.keys)
  const layer = (row?.layer || [])
    .flatMap((layer: TaskLayer) => layer.mapLayers || [])
    .filter((d: TaskMapLayerItem) => keyModelSelect.includes(d.model_id || ''))

  const changeDetection = layer.filter((m) => m.model_id?.toLowerCase().includes(CheckWeeklyChangeDetection))
  const numChangeDetect = changeDetection.reduce((sum, m) => sum + (m.rows || 0), 0)

  const objectDetection = layer.filter((m) => m.model_id?.toLowerCase().includes(CheckWeeklyObjectDetection))
  const numObjectDetect = objectDetection.reduce((sum, m) => sum + (m.rows || 0), 0)

  return {
    changeDetection: changeDetection.length > 0 ? `${formatNumber(numChangeDetect, LOCALE_STRING_OPTIONS)}` : null,
    objectDetection: objectDetection.length > 0 ? `${formatNumber(numObjectDetect, LOCALE_STRING_OPTIONS)}` : null,
  }
}

export const rgbaArrayToCss = (arr: number[] | undefined, fallback: string): string => {
  if (!arr || arr.length < 3) return fallback
  const [r, g, b, a] = arr
  const alpha = typeof a === 'number' ? a / 255 : 1
  return `rgba(${r},${g},${b},${alpha})`
}
