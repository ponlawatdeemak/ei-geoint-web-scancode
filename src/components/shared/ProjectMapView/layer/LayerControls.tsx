import React from 'react'
import { Box, Button, Slider, Tooltip, Select, MenuItem } from '@mui/material'
import ReplayIcon from '@mui/icons-material/Replay'
import {
  GetModelAllDtoOut,
  MapType,
  ProjectMapViewGroup,
  MapArea,
  SARChangeDetectionKey,
  LayerConfig,
} from '@interfaces/index'
import { useTranslation } from 'react-i18next'
import { areaUnits } from '../../../common/dialog/SettingsDialog'
import { useSettings } from '@/hook/useSettings'
import { LOCALE_STRING_OPTIONS } from '@/utils/formatNumber'

type Props = {
  selectedGroup: string | null
  group: ProjectMapViewGroup | undefined
  findModelByKeyOrName?: (k: string) => GetModelAllDtoOut | undefined
  thresholds: Record<string, [number, number]>
  handleLayerConfigChange?: (id: string, config: Partial<LayerConfig>) => void
  handleThresholdChange: (id: string, value: number | number[]) => void
}

const hideConfidenceSliderForKeys = ['planet-weekly-objectdetection-building', 'planet-weekly-objectdetection-road']

// Colormap gradients for visual selection
const COLORMAP_GRADIENTS: Record<string, string> = {
  viridis: 'linear-gradient(90deg, #440154 0%, #3b528b 25%, #21918c 50%, #5ec962 75%, #fde725 100%)',
  plasma: 'linear-gradient(90deg, #0d0887 0%, #7e03a8 25%, #cc4778 50%, #f89540 75%, #f0f921 100%)',
  inferno: 'linear-gradient(90deg, #000004 0%, #420a68 25%, #932667 50%, #dd513a 75%, #fcffa4 100%)',
  magma: 'linear-gradient(90deg, #000004 0%, #3b0f70 25%, #8c2981 50%, #de4968 75%, #fcfdbf 100%)',
  cividis: 'linear-gradient(90deg, #00204d 0%, #414d6b 25%, #7c7b78 50%, #b9ac70 75%, #ffea46 100%)',
  spring: 'linear-gradient(90deg, #ff00ff 0%, #ff4fac 25%, #ff9e59 50%, #ffed00 100%)',
  summer: 'linear-gradient(90deg, #008066 0%, #3da367 25%, #7ac768 50%, #b7eb69 75%, #ffff66 100%)',
  autumn: 'linear-gradient(90deg, #ff0000 0%, #ff5500 25%, #ffaa00 50%, #ffff00 100%)',
  winter: 'linear-gradient(90deg, #0000ff 0%, #0055d4 25%, #00aaff 50%, #00ff80 100%)',
  cool: 'linear-gradient(90deg, #00ffff 0%, #55aaff 25%, #aa55ff 50%, #ff00ff 100%)',
  hot: 'linear-gradient(90deg, #0b0000 0%, #800000 30%, #ff0000 55%, #ffff00 80%, #ffffff 100%)',
  jet: 'linear-gradient(90deg, #000080 0%, #0000ff 12%, #00ffff 37%, #ffff00 62%, #ff0000 87%, #800000 100%)',
  rainbow:
    'linear-gradient(90deg, #8000ff 0%, #0000ff 17%, #00ffff 33%, #00ff00 50%, #ffff00 67%, #ff0000 83%, #ff0000 100%)',
}

const BandSelector = ({
  layerId,
  currentBands,
  currentColormap,
  onChange,
  bandsCount,
  imageType,
}: {
  layerId: string
  currentBands?: number[]
  currentColormap?: string
  onChange: (bands: number[], colormap?: string) => void
  bandsCount?: number
  imageType?: number
}) => {
  const { t } = useTranslation('common')
  const [mode, setMode] = React.useState<'rgb' | 'gray' | 'color'>('rgb')
  const [bands, setBands] = React.useState<number[]>(currentBands || [4, 3, 2])
  const [colormap, setColormap] = React.useState<string>(currentColormap || 'viridis')

  // Sync internal state if props change (optional, but good for consistency)
  React.useEffect(() => {
    if (currentBands) {
      setBands(currentBands)
      if (currentBands.length === 3) {
        setMode('rgb')
      } else if (currentColormap) {
        setMode('color')
        setColormap(currentColormap)
      } else {
        setMode('gray')
      }
    }
  }, [currentBands, currentColormap])

  const handleBandChange = (index: number, value: number) => {
    const newBands = [...bands]
    newBands[index] = value
    setBands(newBands)
    onChange(newBands, mode === 'color' ? colormap : undefined)
  }

  const handleColormapChange = (val: string) => {
    setColormap(val)
    onChange(bands, val)
  }

  const handleModeChange = (newMode: 'rgb' | 'gray' | 'color') => {
    setMode(newMode)
    let newBands: number[] = []
    let newColormap: string | undefined

    if (newMode === 'rgb') {
      newBands = [1, 2, 3]
    } else {
      newBands = [1] // Default for gray/color
      if (newMode === 'color') {
        newColormap = colormap // Keep current selected or default
      }
    }
    setBands(newBands)
    onChange(newBands, newColormap)
  }

  return (
    <Box className='mt-2 rounded-lg bg-(--color-background-light) p-4 py-2'>
      <div className='mb-2 flex items-center justify-between'>
        <div className='text-(--color-text-primary) text-sm'>{t('map.bandComposition')}</div>
        <div className='flex overflow-hidden rounded border border-(--color-gray-border) text-xs'>
          <button
            type='button'
            className={`px-2 py-1 ${mode === 'rgb' ? 'bg-primary text-white' : 'bg-white text-(--color-text-secondary)'}`}
            onClick={() => handleModeChange('rgb')}
          >
            RGB
          </button>
          <button
            type='button'
            className={`px-2 py-1 ${mode === 'gray' ? 'bg-primary text-white' : 'bg-white text-(--color-text-secondary)'}`}
            onClick={() => handleModeChange('gray')}
          >
            Gray
          </button>
          <button
            type='button'
            className={`px-2 py-1 ${mode === 'color' ? 'bg-primary text-white' : 'bg-white text-(--color-text-secondary)'}`}
            onClick={() => handleModeChange('color')}
          >
            Color
          </button>
        </div>
      </div>

      {mode === 'rgb' ? (
        <div className='grid grid-cols-3 gap-2'>
          {['Red', 'Green', 'Blue'].map((color, i) => (
            <div key={color} className='flex flex-col'>
              <label className='mb-1 text-(--color-text-secondary) text-xs'>{color}</label>
              <select
                className='rounded border border-(--color-gray-border) bg-white p-1 text-sm'
                value={bands[i] || 0}
                onChange={(e) => handleBandChange(i, Number(e.target.value))}
              >
                {/* Set default bandComposition value for RGB to 3 */}
                {[...Array(bandsCount || 3)].map((_, j) => (
                  <option key={j + 1} value={j + 1}>
                    Band {j + 1}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      ) : (
        <div className='flex flex-col gap-2'>
          <div className='flex flex-col'>
            <label className='mb-1 text-(--color-text-secondary) text-xs'>Band</label>
            <select
              className='rounded border border-(--color-gray-border) bg-white p-1 text-sm'
              value={bands[0] || 1}
              onChange={(e) => handleBandChange(0, Number(e.target.value))}
            >
              {/* Set default bandComposition value for single color to 3 */}
              {[...Array(bandsCount || 3)].map((_, j) => (
                <option key={j + 1} value={j + 1}>
                  Band {j + 1}
                </option>
              ))}
            </select>
          </div>
          {mode === 'color' && (
            <div className='flex flex-col'>
              <label className='mb-1 text-(--color-text-secondary) text-xs'>Colormap</label>
              <Select
                size='small'
                value={colormap}
                onChange={(e) => handleColormapChange(e.target.value)}
                className='bg-white'
                sx={{
                  '.MuiSelect-select': { display: 'flex', alignItems: 'center', gap: 1, padding: '6px 12px' },
                }}
              >
                {Object.keys(COLORMAP_GRADIENTS).map((cm) => (
                  <MenuItem key={cm} value={cm}>
                    <div className='flex w-full items-center gap-2'>
                      <div
                        className='h-4 w-12 rounded border border-gray-200'
                        style={{ background: COLORMAP_GRADIENTS[cm] || '#ccc' }}
                      />
                      <span className='text-sm capitalize'>{cm}</span>
                    </div>
                  </MenuItem>
                ))}
              </Select>
            </div>
          )}
        </div>
      )}
    </Box>
  )
}

const LayerControls: React.FC<Props> = ({
  selectedGroup,
  group,
  findModelByKeyOrName,
  thresholds,
  handleThresholdChange,
  handleLayerConfigChange,
}) => {
  const { t, i18n } = useTranslation('common')
  const { areaUnit } = useSettings()

  if (!selectedGroup || !group) return null

  // Filter visible layers, now including tile layers for band config
  const visibleLayers = group.layers.filter(
    (l) =>
      l.type === MapType.vector ||
      l.type === MapType.tile ||
      l.type === MapType.itvRasterTile ||
      l.type === MapType.itvVectorTile,
  )
  const lengthLayer = visibleLayers.length

  console.log('selectedGroup ', selectedGroup)
  console.log('group ', group)

  return (
    <Box className='h-full overflow-y-auto pr-2'>
      {visibleLayers.map((layer, index) => {
        const isTh = typeof i18n?.language === 'string' && i18n.language.startsWith('th')
        const title = isTh
          ? (findModelByKeyOrName?.(layer.key)?.name ?? layer.label)
          : (findModelByKeyOrName?.(layer.key)?.nameEn ?? layer.label)
        const itemCount =
          layer.itemCount !== undefined && layer.itemCount !== null
            ? layer.itemCount.toLocaleString(undefined, LOCALE_STRING_OPTIONS)
            : '0'
        const rawTotalArea = (layer.totalArea as MapArea)?.[areaUnit as keyof MapArea]
        const totalArea = rawTotalArea ? Number(rawTotalArea).toLocaleString(undefined, LOCALE_STRING_OPTIONS) : '0'

        // Find current config for this layer to get current bands
        const currentConfig = group.layerConfigs?.find((c) => c.id === layer.id)
        const isTileLayer = layer.type === MapType.tile || layer.type === MapType.itvRasterTile

        return (
          <Box
            key={layer.id}
            className={`mt-0 rounded bg-white pt-2 ${index < lengthLayer - 1 ? 'border-(--color-gray-border) border-b-1' : ''}`}
          >
            <Box className='flex w-full items-start'>
              <Box className='w-full'>
                {((currentConfig as any)?.imageType === undefined || (currentConfig as any)?.imageType === 1) && (
                  <Box className='flex items-center'>
                    <div className='text-(--color-text-primary) text-base'>{title}</div>
                  </Box>
                )}
                {!isTileLayer && (
                  <Box className='grid w-full grid-cols-1 gap-0.5'>
                    <div className='pt-1.5 text-(--color-text-secondary) text-sm'>
                      {t('map.buildings')}
                      <span className='font-medium text-primary'>
                        {' '}
                        {itemCount} {t('map.items')}
                      </span>
                    </div>
                    <div />
                    {layer.key !== SARChangeDetectionKey && totalArea !== null && (
                      <div className='mt-1 block text-(--color-text-secondary) text-sm'>
                        {t('map.totalArea')}
                        <span className='ml-1 font-medium text-primary'>
                          {totalArea} {t(areaUnits.find((u) => u.code === areaUnit)?.label || '')}
                        </span>
                      </div>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
            {isTileLayer && handleLayerConfigChange && (currentConfig as any)?.imageType === 1 && (
              <BandSelector
                layerId={layer.id}
                currentBands={(currentConfig as any)?.bands}
                currentColormap={(currentConfig as any)?.colormapName}
                bandsCount={(currentConfig as any)?.bandsCount}
                imageType={(currentConfig as any)?.imageType}
                onChange={(bands, colormap) => handleLayerConfigChange(layer.id, { bands, colormapName: colormap })}
              />
            )}
            {!isTileLayer && !hideConfidenceSliderForKeys.includes(layer.key) && (
              <Box className='mt-4 mb-2 rounded-lg bg-(--color-background-light) p-4 py-2'>
                <Box className='mt-2 grid w-full grid-cols-2 gap-1'>
                  <div className='mb-2 block text-(--color-text-primary) text-sm'>{t('map.adjustConfidence')}</div>
                  <Box className='flex items-start justify-end'>
                    <Tooltip title={t('map.reset')} arrow>
                      <Button
                        variant='outlined'
                        className='border-transparent!'
                        startIcon={<ReplayIcon />}
                        onClick={() => handleThresholdChange(layer.id, [0, 100])}
                      >
                        {t('map.reset')}
                      </Button>
                    </Tooltip>
                  </Box>
                </Box>
                <div className='px-2 pr-4'>
                  <Slider
                    value={thresholds[layer.id] ?? [0, 100]}
                    onChange={(_, value) => handleThresholdChange(layer.id, value as number[])}
                    min={0}
                    max={100}
                    valueLabelDisplay='auto'
                    marks={[
                      { value: 0, label: '0%' },
                      { value: 100, label: '100%' },
                    ]}
                    disableSwap={false}
                  />
                </div>
              </Box>
            )}
          </Box>
        )
      })}
    </Box>
  )
}

export default LayerControls
