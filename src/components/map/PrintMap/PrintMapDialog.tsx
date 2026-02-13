// import { BasemapType } from '@/components/common/map/interface/map'
import MapView from '@/components/common/map/MapView'
import useMapStore from '@/components/common/map/store/map'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material'
import classNames from 'classnames'

import React, { useEffect, useMemo } from 'react'
// import { BurntMapDetailType, GridType, MAP_EXPORT, MINI_MAP_EXPORT, PlantMapDetailType } from '.'
import { GridType, MAP_EXPORT, MINI_MAP_EXPORT } from '.'
import { formatDateWithFormatString } from '@/utils/formatDate'
import { useSettings } from '@/hook/useSettings'
import { useTranslation } from 'react-i18next'
import { MiniMapCompassIcon } from '@/components/common/map/svg/MenuIcon'
import { BasemapType } from '@/components/common/map/config/map'

interface PrintMapDialogProps {
  className?: string
  id: string
  open: boolean
  gridColsArray: GridType[]
  gridRowsArray: GridType[]
  printDetails?: {
    displayDialogTitle?: string | null
    organization?: {
      th: string
      en: string
    } | null
  } | null
  loading?: boolean
  disabled?: boolean
  handleMapPdfExport: () => Promise<void>
  onClose: () => void
  sourceMapId?: string
}

const PrintMapDialog: React.FC<PrintMapDialogProps> = ({
  className = '',
  id,
  open,
  gridColsArray,
  gridRowsArray,
  printDetails,
  loading,
  disabled,
  handleMapPdfExport,
  onClose,
  sourceMapId,
}) => {
  const { basemap, mapLibre } = useMapStore()
  const { t } = useTranslation('common')

  const { language } = useSettings()

  // Clone layers and sources from source map to export maps
  useEffect(() => {
    if (!open) return
    if (!sourceMapId || !mapLibre[sourceMapId]) return

    const sourceMap = mapLibre[sourceMapId]
    const exportMap = mapLibre[`${id}-${MAP_EXPORT}`]
    const miniMap = mapLibre[`${id}-${MINI_MAP_EXPORT}`]

    if (!exportMap) return

    const addedLayers: string[] = []
    const addedSources: string[] = []

    try {
      // Clone images (for milsymbol and other runtime images)
      const images = sourceMap.listImages()
      if (images) {
        images.forEach((imageId) => {
          const image = sourceMap.getImage(imageId)
          if (!image) return

          if (!exportMap.hasImage(imageId)) {
            exportMap.addImage(imageId, image.data, {
              pixelRatio: image.pixelRatio,
              sdf: image.sdf,
              stretchX: image.stretchX,
              stretchY: image.stretchY,
              content: image.content,
            })
          }

          if (miniMap && !miniMap.hasImage(imageId)) {
            miniMap.addImage(imageId, image.data, {
              pixelRatio: image.pixelRatio,
              sdf: image.sdf,
              stretchX: image.stretchX,
              stretchY: image.stretchY,
              content: image.content,
            })
          }
        })
      }

      // Get all sources from source map
      const sourceStyle = sourceMap.getStyle()
      if (sourceStyle?.sources) {
        Object.entries(sourceStyle.sources).forEach(([sourceName, sourceConfig]) => {
          try {
            if (!exportMap.getSource(sourceName)) {
              exportMap.addSource(sourceName, sourceConfig as any)
              addedSources.push(sourceName)
            }
            // mini map: do not clone sources
          } catch (err) {
            console.debug(`Error adding source ${sourceName}:`, err)
          }
        })
      }

      // Get all layers from source map
      if (sourceStyle?.layers) {
        sourceStyle.layers.forEach((layer) => {
          try {
            if (!exportMap.getLayer(layer.id)) {
              exportMap.addLayer(layer as any)
              addedLayers.push(layer.id)
            }
            // mini map: do not clone layers
          } catch (err) {
            console.debug(`Error adding layer ${layer.id}:`, err)
          }
        })
      }
    } catch (err) {
      console.error('Error cloning layers from source map:', err)
    }

    return () => {
      // Cleanup added layers/sources
      addedLayers.reverse().forEach((layerId) => {
        if (exportMap.getLayer(layerId)) {
          exportMap.removeLayer(layerId)
        }
      })
      addedSources.forEach((sourceId) => {
        if (exportMap.getSource(sourceId)) {
          exportMap.removeSource(sourceId)
        }
      })
    }
  }, [sourceMapId, mapLibre, id, open])

  const gridElement = useMemo(() => {
    return (
      <>
        {/* Vertical Lines */}
        {gridColsArray.map((gridCol) => {
          return (
            <React.Fragment key={gridCol.key}>
              <div className='absolute top-0 h-full w-[1px] bg-black' style={{ left: `${gridCol.percent}%` }} />

              {/* Top Label */}
              <span
                className='absolute -top-4 -translate-x-1/2 text-black text-xs'
                style={{ left: `${gridCol.percent}%` }}
              >
                {gridCol.value}
              </span>

              {/* Bottom Label */}
              <span
                className='absolute -bottom-4 -translate-x-1/2 text-black text-xs'
                style={{ left: `${gridCol.percent}%` }}
              >
                {gridCol.value}
              </span>
            </React.Fragment>
          )
        })}

        {/* Horizontal Lines */}
        {gridRowsArray.map((gridRow) => {
          return (
            <React.Fragment key={gridRow.key}>
              <div className='absolute left-0 h-[1px] w-full bg-black' style={{ bottom: `${gridRow.percent}%` }} />

              {/* Left Label */}
              <span
                className='absolute -left-2 -translate-x-1/2 translate-y-1/2 text-black text-xs'
                style={{
                  bottom: `${gridRow.percent}%`,
                  transform: 'rotate(-90deg)',
                }}
              >
                {gridRow.value}
              </span>

              {/* Right Label */}
              <span
                className='absolute -right-2 translate-x-1/2 translate-y-1/2 text-black text-xs'
                style={{ bottom: `${gridRow.percent}%`, transform: 'rotate(90deg)' }}
              >
                {gridRow.value}
              </span>
            </React.Fragment>
          )
        })}
      </>
    )
  }, [gridColsArray, gridRowsArray])

  return (
    <div className='relative'>
      <Dialog
        className={classNames('', className)}
        open={open}
        onClose={(_event, reason) => {
          if (reason !== 'backdropClick') {
            onClose()
          }
        }}
        PaperProps={{
          className: 'w-[1025px] !max-w-none lg:h-[627px] !m-6',
        }}
      >
        <DialogTitle className='!py-3 max-lg:!px-5 flex items-center gap-2'>
          <Typography className='!text-md !leading-5 flex-1'>{printDetails?.displayDialogTitle || ''}</Typography>
        </DialogTitle>
        <DialogContent className='!py-4 max-lg:!px-4 flex h-full w-full flex-col justify-between bg-white'>
          {loading ? (
            <div className='flex h-full w-full items-center justify-center'>
              <CircularProgress />
            </div>
          ) : (
            <Box className='flex h-full w-full items-center gap-5 max-lg:flex-col lg:gap-6'>
              <Box className='flex h-full flex-1 flex-col gap-4 max-lg:w-full'>
                <Box className='relative aspect-[738/473] w-full border border-black border-solid p-4 lg:max-h-[473px] lg:p-6'>
                  <Box
                    id={`${id}-map-export-container`}
                    className={classNames(
                      '[&_.maplibregl-compact]:!box-border [&_.maplibregl-compact]:!h-4 [&_.maplibregl-compact]:!min-h-0 [&_.maplibregl-compact]:!pr-4 [&_.maplibregl-ctrl-attrib-button]:!h-4 [&_.maplibregl-ctrl-attrib-button]:!w-4 [&_.maplibregl-ctrl-attrib-button]:!bg-contain [&_.maplibregl-ctrl-bottom-right]:!z-[0] [&_.maplibregl-ctrl-scale]:!mb-0 flex h-full w-full [&_.map-tools]:hidden [&_.maplibregl-compact]:flex [&_.maplibregl-compact]:items-center [&_.maplibregl-ctrl-attrib-inner]:mr-1 [&_.maplibregl-ctrl-attrib-inner]:text-[6px] [&_.maplibregl-ctrl-attrib-inner]:leading-3',
                      {
                        '[&_.maplibregl-ctrl-bottom-right]:max-sm:!mb-[22px]': id === 'burnt',
                        '[&_.maplibregl-compact]:!mb-[42px] [&_.maplibregl-ctrl-bottom-right]:max-sm:!bottom-[-10px]':
                          id === 'plant',
                      },
                    )}
                  >
                    <MapView
                      isShowOpenBtn={false}
                      isShowLayerDetailsBtn={false}
                      isShowBasicTools={false}
                      mapId={`${id}-${MAP_EXPORT}`}
                      isPaddingGoogle={false}
                      isHideAttributionControl={true}
                    />
                  </Box>

                  {gridElement}
                </Box>
              </Box>
              <Box className='flex h-full w-full flex-col items-center lg:w-[22%]'>
                <Box className='relative aspect-[215/287] w-full'>
                  <Box
                    id={`${id}-mini-map-export-container`}
                    className='[&_.maplibregl-compact]:!mr-[5px] [&_.maplibregl-compact]:!box-border [&_.maplibregl-compact]:!h-4 [&_.maplibregl-compact]:!min-h-0 [&_.maplibregl-compact]:!pr-4 [&_.maplibregl-ctrl-attrib-button]:!h-4 [&_.maplibregl-ctrl-attrib-button]:!w-4 [&_.maplibregl-ctrl-attrib-button]:!bg-contain flex h-full w-full [&_.map-tools]:hidden [&_.maplibregl-compact]:flex [&_.maplibregl-compact]:items-center [&_.maplibregl-ctrl-attrib-inner]:mr-1 [&_.maplibregl-ctrl-attrib-inner]:text-[6px] [&_.maplibregl-ctrl-scale]:hidden'
                  >
                    <MapView
                      isShowOpenBtn={false}
                      isShowLayerDetailsBtn={false}
                      isShowBasicTools={false}
                      mapId={`${id}-${MINI_MAP_EXPORT}`}
                      isInteractive={false}
                      isHideAttributionControl={true}
                    />
                  </Box>

                  <Box className='absolute top-[5px] right-[5px]'>
                    <MiniMapCompassIcon fill={basemap === BasemapType.CartoLight ? 'black' : 'white'} />
                  </Box>
                </Box>

                <Box className='flex w-full flex-1 flex-col items-center justify-between bg-[#F1F4FB] p-4'>
                  <Box className='flex w-full flex-1 flex-col gap-2 pb-4 md:pb-0 lg:gap-1.5'>
                    <Box className='flex w-full flex-row gap-2'>
                      <Typography className='flex-1 text-black text-xs!'>{t('tools.printMap.reportDate')}</Typography>
                      <Typography className='flex-1 font-bold! text-black text-xs!'>
                        {formatDateWithFormatString(new Date(), language, 'D/MM/YYYY')}
                      </Typography>
                    </Box>
                    {printDetails && printDetails.organization !== null && (
                      <Box className='flex w-full flex-row gap-2'>
                        <Typography className='! flex-1 text-black text-xs!'>{t('tools.printMap.orgName')}</Typography>

                        <Typography className='flex-1 font-bold! text-black text-xs!'>
                          {printDetails?.organization?.[language as keyof typeof printDetails.organization]}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <Box className='flex w-full flex-col'>
                    <Typography className='text-center text-[#1E1E1E] text-[10px]! lg:text-[8px]!'>
                      {'Intelligence Reconnaissance Insights System'}
                    </Typography>
                  </Box>
                </Box>
                <Box className='h-6'></Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={onClose}
            disabled={disabled}
            color='inherit'
            startIcon={disabled && <CircularProgress size={20} color='inherit' />}
          >
            {t('button.cancel')}
          </Button>
          <Button
            onClick={handleMapPdfExport}
            disabled={disabled}
            color='primary'
            startIcon={disabled && <CircularProgress size={20} color='inherit' />}
          >
            {t('button.downloadPdf')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* hidden Dialog for PDF image */}
      <Dialog
        className={classNames(
          'hidden-dialog !z-[-9999] [&_.MuiBackdrop-root]:!opacity-0 [&_.MuiDialog-container]:!absolute [&_.MuiDialog-container]:!left-[-9999px] [&_.MuiDialog-container]:!top-[-9999px]',
          className,
        )}
        open={open}
        onClose={(_event, reason) => {
          if (reason !== 'backdropClick') {
            onClose()
          }
        }}
        PaperProps={{
          className: '!max-w-[1025px] !min-w-[1025px] !w-[1025px] !min-h-[627px] !max-h-[627px] !h-[627px] !m-6  ',
        }}
      >
        <DialogTitle className='!py-3 flex items-center gap-2'>
          <Typography className='!text-md !leading-5 flex-1'>{printDetails?.displayDialogTitle}</Typography>
        </DialogTitle>
        <DialogContent className='!py-4 flex h-full w-full flex-col justify-between bg-white'>
          <Box className='flex h-full w-full items-center gap-6'>
            <Box className='flex h-full flex-1 flex-col gap-4'>
              <Box className='relative aspect-[738/473] max-h-[473px] w-full border border-black border-solid p-6'>
                <Box
                  className='captured-map-image aspect-[688/423] w-full bg-contain'
                  component='img'
                  alt='Map Image'
                />

                {/* Map's legend */}

                {basemap === BasemapType.GoogleHybrid ||
                  (basemap === BasemapType.GoogleSatellite && (
                    <img
                      src={'/images/map/google_on_non_white_hdpi.png'}
                      width={59}
                      height={18}
                      className={classNames(`absolute bottom-8 left-[calc(50%-29.5px)] z-[9] md:bottom-8`)}
                      alt={`Google Logo`}
                    />
                  ))}
                {gridElement}
              </Box>
            </Box>
            <Box className='flex h-full w-[22%] flex-col items-center'>
              <Box className='relative aspect-[215/287]'>
                <Box
                  className='captured-mini-map-image h-full w-full bg-contain'
                  component='img'
                  alt='Mini Map Image'
                />

                <Box className='absolute top-[5px] right-[5px]'>
                  <MiniMapCompassIcon fill={basemap === BasemapType.CartoLight ? 'black' : 'white'} />
                </Box>

                {basemap === BasemapType.GoogleHybrid ||
                  (basemap === BasemapType.GoogleSatellite && (
                    <img
                      src={'/images/map/google_on_non_white_hdpi.png'}
                      width={59}
                      height={18}
                      className={classNames(`absolute bottom-2 left-[calc(50%-29.5px)] z-[9] md:bottom-2`)}
                      alt={`Google Logo`}
                    />
                  ))}
              </Box>

              <Box className='flex w-full flex-1 flex-col items-center justify-between bg-[#F1F4FB] p-4'>
                <Box className='flex w-full flex-1 flex-col gap-2 lg:gap-1.5'>
                  <Box className='flex w-full flex-row gap-2'>
                    <Typography className='flex-1 text-black text-xs!'>{t('tools.printMap.reportDate')}</Typography>
                    <Typography className='flex-1 font-bold! text-black text-xs!'>
                      {formatDateWithFormatString(new Date(), language, 'D/MM/YYYY')}
                    </Typography>
                  </Box>
                  <Box className='flex w-full flex-row gap-2'>
                    <Typography className='! flex-1 text-black text-xs!'>{t('tools.printMap.orgName')}</Typography>
                    <Typography className='flex-1 font-bold! text-black text-xs!'>
                      {printDetails?.organization?.[language as keyof typeof printDetails.organization]}
                    </Typography>
                  </Box>
                </Box>

                <Box className='flex w-full flex-col'>
                  <Typography className='text-center text-[#1E1E1E] text-[10px]! lg:text-[8px]!'>
                    {'Intelligence Reconnaissance Insights System'}
                  </Typography>
                </Box>
              </Box>
              <Box className='h-20'></Box>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PrintMapDialog
