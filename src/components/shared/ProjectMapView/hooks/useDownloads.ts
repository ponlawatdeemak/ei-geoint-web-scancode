import { useCallback } from 'react'
import { downloadFileItem } from '@/utils/download'
import type { LayerConfig, ProjectMapViewGroup, TaskDownloadItem } from '@interfaces/index'

export function useDownloads(params: {
  layerList: ProjectMapViewGroup[]
  layerVisibility: Record<string, boolean>
  showAlert: (a: { status: 'error' | 'success' | 'warning' | 'info'; content: string }) => void
  t: (k: string) => string
}) {
  const { layerList, layerVisibility, showAlert, t } = params

  const downloadAoiGeoJson = useCallback((aoiConfig: LayerConfig | undefined) => {
    if (!aoiConfig?.data) return
    try {
      const geojsonData = typeof aoiConfig.data === 'string' ? JSON.parse(aoiConfig.data) : aoiConfig.data
      const geojsonString = JSON.stringify(geojsonData, null, 2)
      const blob = new Blob([geojsonString], { type: 'application/geo+json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const fileName = (aoiConfig as { label?: string }).label || 'aoi'
      link.download = `${fileName}.geojson`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Error downloading AOI GeoJSON:', e)
    }
  }, [])

  const shouldIncludeDownloadItem = useCallback(
    (d: TaskDownloadItem, groupId: string, fileTypes: string[]): boolean => {
      if (typeof d.model_id === 'string') {
        const parts = d.model_id.split('-')
        const lastPart = parts[parts.length - 1]
        if (lastPart !== 'tile') {
          const itemType = String(d.type || d.format || '').toLowerCase()
          if (fileTypes && fileTypes.length > 0) {
            const matchesType = fileTypes.some((ft) => itemType.includes(ft.toLowerCase()))
            if (!matchesType) return false
          }
        }
      }
      let candidateId = `${groupId}-${d.model_id}`
      if (typeof d.model_id === 'string' && d.model_id.split('-')[0] === 'sar' && d.geometry_type === 'Point') {
        candidateId = `${groupId}-${d.model_id}-point`
      }
      return !!layerVisibility[candidateId]
    },
    [layerVisibility],
  )

  const getAoiLayerKeys = useCallback(
    (groupId: string) => {
      return Object.keys(layerVisibility).filter(
        (key) => key.startsWith(groupId) && key.split('-').pop() === 'aoi' && layerVisibility[key],
      )
    },
    [layerVisibility],
  )

  const hasVisibleLayerForGroup = useCallback(
    (groupId: string) => {
      return Object.keys(layerVisibility).some((key) => key.startsWith(groupId) && !!layerVisibility[key])
    },
    [layerVisibility],
  )

  const hasVisibleVectorLayerForGroup = useCallback(
    (groupId: string) => {
      return Object.keys(layerVisibility).some((key) => {
        if (!key.startsWith(groupId)) return false
        const parts = key.split('-')
        const last = parts[parts.length - 1]
        if (last === 'aoi' || last === 'tile') return false
        return !!layerVisibility[key]
      })
    },
    [layerVisibility],
  )

  const downloadGroup = useCallback(
    async (groupId: string, fileTypes: string[]) => {
      const group = layerList.find((g) => g.groupId === groupId)
      if (!group) return

      const downloadItems: TaskDownloadItem[] = (group.download ?? []).filter((d) =>
        shouldIncludeDownloadItem(d, groupId, fileTypes),
      )

      const aoiLayerKeys = getAoiLayerKeys(groupId)

      if (downloadItems.length === 0 && aoiLayerKeys.length === 0) {
        showAlert({ status: 'error', content: t('map.pleaseSelectDataToDownload') })
        return
      }

      // AOI
      for (const aoiKey of aoiLayerKeys) {
        const aoiConfig = (group.layerConfigs ?? []).find((cfg) => cfg.id === aoiKey)
        if (aoiConfig) await downloadAoiGeoJson(aoiConfig)
      }

      // Files
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
      for (const item of downloadItems) {
        console.log(' Downloading file:', item.href)
        await downloadFileItem(item.href)
        await sleep(1000)
      }
    },
    [layerList, shouldIncludeDownloadItem, getAoiLayerKeys, showAlert, t, downloadAoiGeoJson],
  )

  const downloadAnalysisData = useCallback(async () => {
    if (layerList.length > 0) {
      const download = layerList[0].download || []
      const downloadItems: TaskDownloadItem[] = (download ?? []).filter((d) => {
        if (typeof d.model_id === 'string') {
          const parts = d.model_id.split('-')
          const lastPart = parts[parts.length - 1]
          return lastPart === 'tile'
        }
        return false
      })

      const data = (layerList[0].layerConfigs ?? []).find((cfg) => cfg.type === 'geojson') as LayerConfig | undefined
      if (data) await downloadAoiGeoJson(data)
      for (const item of downloadItems) await downloadFileItem(item.href)
    }
  }, [layerList, downloadAoiGeoJson])

  return {
    downloadAoiGeoJson,
    downloadGroup,
    downloadAnalysisData,
    hasVisibleLayerForGroup,
    hasVisibleVectorLayerForGroup,
  }
}
