import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { formatDate } from '@/utils/formatDate'
import type { TaskFeature, GetModelAllDtoOut } from '@interfaces/index'
import { CheckWeeklyChangeDetection, CheckWeeklyObjectDetection, Language } from '@interfaces/config'
import { DefaultModelColorConfig } from '@interfaces/config/color.config'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/hook/useSettings'
import { useMemo, useState, useCallback, useEffect } from 'react'
import { useWeeklyMapStore, type ModelItem } from './store/useWeeklyMapStore'
import { getColorByModelId } from '@/utils/color'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

import { useMediaQuery } from '@mui/material'
import theme from '@/styles/theme'

interface WeeklyChartProps {
  className?: string
  data: TaskFeature[]
  modelAll?: GetModelAllDtoOut[]
}
// จำเป็นต้องกำหนด font ถ้าไม่ทำ font จะเพี้ยน
const chartFontFamily = 'Prompt'

interface BaseMapLayer {
  id?: unknown
  model_id?: string
  title?: unknown
  color_code?: unknown
  rows?: unknown
}

interface ChartDatasetContext {
  keyModelSelect: Set<string>
  t: (key: string) => string | undefined | null
  isTh: boolean
  modelAll?: GetModelAllDtoOut[]
  sortedDataLength: number
}

interface DatasetItem {
  label: string
  data: number[]
  borderColor: string
  backgroundColor: string
}

function getBaseLabel(mapLayer: BaseMapLayer, key: string, modelAll?: GetModelAllDtoOut[], isTh?: boolean) {
  const modelInfo = modelAll?.find((m) => m.key === key || m.modelName === key)
  const modelName = isTh ? modelInfo?.name : modelInfo?.nameEn
  if (modelName) return modelName

  return typeof mapLayer.title === 'string' ? mapLayer.title : key
}

function getDetectionPrefix(key: string, t: (key: string) => string | undefined | null) {
  const lowerKey = key.toLowerCase()
  if (lowerKey.includes(CheckWeeklyChangeDetection)) {
    return `${(t('map.weeklyChangeDetection') as string) || 'Change Detection'} - `
  }
  if (lowerKey.includes(CheckWeeklyObjectDetection)) {
    return `${(t('map.weeklyObjectDetection') as string) || 'Object Detection'} - `
  }
  return ''
}

function getLayerColor(key: string, defaultColorRaw: unknown) {
  if (typeof defaultColorRaw === 'string' && defaultColorRaw) {
    return defaultColorRaw
  }
  return getColorByModelId(key)
}

function processMapLayerForChart(
  mapLayer: BaseMapLayer,
  index: number,
  ctx: ChartDatasetContext,
  datasetsMap: Map<string, DatasetItem>,
) {
  const mapLayerId = (mapLayer as { id?: unknown }).id
  if (typeof mapLayerId !== 'string') return

  const idParts = mapLayerId.split('-')
  if (idParts.at(-1) === 'centroid_tile') return

  const key = mapLayer.model_id ?? ''
  const baseLabel = getBaseLabel(mapLayer, key, ctx.modelAll, ctx.isTh)
  const prefix = getDetectionPrefix(key, ctx.t)
  const label = `${prefix}${baseLabel}`
  const color = getLayerColor(key, mapLayer.color_code)

  const itemCount = typeof mapLayer.rows === 'number' ? mapLayer.rows : 0

  if (!datasetsMap.has(key)) {
    datasetsMap.set(key, {
      label,
      data: new Array(ctx.sortedDataLength).fill(0),
      borderColor: color,
      backgroundColor: color,
    })
  }

  const dataset = datasetsMap.get(key)
  if (dataset) {
    dataset.data[index] += itemCount
  }
}

export const WeeklyChart: React.FC<WeeklyChartProps> = ({ className, data, modelAll }) => {
  const { t, i18n } = useTranslation('common')
  const { language } = useSettings()
  const { selectedModels } = useWeeklyMapStore()

  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [hiddenDatasets, setHiddenDatasets] = useState<Set<number>>(new Set())
  const [chartColors, setChartColors] = useState({ grid: '#f0f0f0', text: '#666' })

  useEffect(() => {
    if (globalThis.window !== undefined) {
      const computedStyle = getComputedStyle(document.documentElement)
      const grid = computedStyle.getPropertyValue('--color-chart-grid').trim() || '#f0f0f0'
      const text = computedStyle.getPropertyValue('--color-chart-text').trim() || '#666'
      setChartColors({ grid, text })
    }
  }, [])

  const toggleDataset = useCallback((index: number) => {
    setHiddenDatasets((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  const options = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: isMobile ? { top: 10, bottom: 20 } : undefined, // add padding at the bottom for mobile X-axis labels
      },
      plugins: {
        legend: {
          display: !isMobile, // Hide default canvas legend on mobile so we can use a custom HTML one
          position: 'top' as const,
          align: 'center' as const,
          onClick: (_e: unknown, legendItem: { datasetIndex?: number }) => {
            if (legendItem.datasetIndex !== undefined) {
              toggleDataset(legendItem.datasetIndex)
            }
          },
          labels: {
            usePointStyle: false,
            boxWidth: 24,
            boxHeight: 8,
            font: {
              family: chartFontFamily,
              size: 12,
            },
            padding: 16,
          },
        },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          titleFont: { family: chartFontFamily },
          bodyFont: { family: chartFontFamily },
        },
      },
      scales: {
        x: {
          grid: {
            display: true,
            color: chartColors.grid,
          },
          ticks: {
            font: { family: chartFontFamily, size: 10 },
            color: chartColors.text,
          },
          border: { display: false },
        },
        y: {
          ticks: {
            stepSize: 2000,
            font: { family: chartFontFamily, size: 10 },
            color: chartColors.text,
          },
          grid: {
            display: true,
            color: chartColors.grid,
          },
          border: { display: false },
        },
      },
      interaction: {
        mode: 'nearest' as const,
        axis: 'x' as const,
        intersect: false,
      },
      elements: {
        line: {
          tension: 0,
          borderWidth: 1.5,
        },
        point: {
          radius: 3,
          hoverRadius: 5,
        },
      },
    }
  }, [isMobile, toggleDataset, chartColors])

  const chartData = useMemo(() => {
    if (!data || data.length === 0 || !selectedModels) {
      return { labels: [], datasets: [] }
    }

    const keyModelSelect: Set<string> = new Set(selectedModels.flatMap((m: ModelItem) => m.keys))

    // Sort data by date ascending
    const sortedData = [...data].sort((a, b) => new Date(a.date || '').getTime() - new Date(b.date || '').getTime())

    const labels = sortedData.map((d) => formatDate(d.date || '', language, false))

    const isTh = language === Language.TH || i18n.language === Language.TH
    const ctx: ChartDatasetContext = {
      keyModelSelect,
      t,
      isTh,
      modelAll,
      sortedDataLength: sortedData.length,
    }

    const datasetsMap = new Map<string, DatasetItem>()

    for (const [index, feature] of sortedData.entries()) {
      if (!feature.layer) continue

      for (const layer of feature.layer) {
        if (!layer.mapLayers) continue

        for (const mapLayer of layer.mapLayers) {
          processMapLayerForChart(mapLayer, index, ctx, datasetsMap)
        }
      }
    }

    const sortedDatasets = Array.from(datasetsMap.values()).sort((a, b) =>
      b.label.localeCompare(a.label, isTh ? 'th' : 'en'),
    )

    return {
      labels,
      datasets: sortedDatasets.map((ds, index) => ({
        ...ds,
        hidden: hiddenDatasets.has(index),
      })),
    }
  }, [data, language, selectedModels, modelAll, i18n.language, t, hiddenDatasets])

  return (
    <div className={className} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {chartData.datasets.length > 0 ? (
        <>
          {isMobile && (
            <div className='flex flex-col gap-2 px-4 pt-2 pb-8'>
              {chartData.datasets.map((dataset, i) => {
                const isHidden = hiddenDatasets.has(i)
                return (
                  <button
                    type='button'
                    key={dataset.label || i.toString()}
                    className='flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-left'
                    onClick={() => toggleDataset(i)}
                  >
                    <span
                      className='inline-block h-2 w-6 shrink-0'
                      style={{ backgroundColor: isHidden ? chartColors.grid : dataset.borderColor }}
                    ></span>
                    <span
                      className='text-xs leading-tight'
                      style={{
                        fontFamily: chartFontFamily,
                        color: isHidden ? chartColors.grid : chartColors.text,
                        textDecoration: isHidden ? 'line-through' : 'none',
                      }}
                    >
                      {dataset.label}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
          <div
            className={`relative h-full min-h-0 w-full flex-1 ${isMobile ? 'overflow-x-auto overflow-y-hidden' : ''}`}
          >
            <div
              className='h-full'
              style={{ minWidth: isMobile ? `${Math.max(chartData.labels.length * 3.75, 25)}rem` : '100%' }}
            >
              <Line options={options} data={chartData} />
            </div>
          </div>
        </>
      ) : (
        <div
          className='flex h-full w-full items-center justify-center text-gray-500 text-sm'
          style={{ fontFamily: chartFontFamily }}
        >
          {t('common.noData') || 'No data available'}
        </div>
      )}
    </div>
  )
}
