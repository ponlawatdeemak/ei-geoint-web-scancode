// import { BasemapType } from '@/components/common/map/interface/map'
import MapView from '@/components/common/map/MapView'
import useMapStore from '@/components/common/map/store/map'
import Image from 'next/image'
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

import React, { useCallback, useEffect } from 'react'
// import { BurntMapDetailType, GridType, MAP_EXPORT, MINI_MAP_EXPORT, PlantMapDetailType } from '.'
import { GridType, MAP_EXPORT, MINI_MAP_EXPORT } from '.'
import { formatDateWithFormatString } from '@/utils/formatDate'
import { useSettings } from '@/hook/useSettings'
import { useTranslation } from 'react-i18next'
import { MiniMapCompassIcon } from '@/components/common/map/svg/MenuIcon'
import { BasemapType } from '@/components/common/map/config/map'
import useResponsive from '@/hook/responsive'

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
  const { is2K } = useResponsive()
  const { language, copyLocationType } = useSettings()

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
              const isSymbolLayer = layer?.type === 'symbol'
              if (is2K && isSymbolLayer) {
                const iconSize = layer?.layout?.['icon-size'] as number
                if (layer.layout) {
                  layer.layout['icon-size'] = iconSize / 2
                }
              }
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
      addedLayers.toReversed().forEach((layerId) => {
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

  const getGridElement = useCallback(
    (isExport: boolean) => {
      const showGridLabels = copyLocationType !== 'MGRS'

      return (
        <>
          {/* Vertical Lines */}
          {gridColsArray.map((gridCol) => {
            return (
              <React.Fragment key={gridCol.key}>
                <div className='absolute top-0 h-full w-px bg-black' style={{ left: `${gridCol.percent}%` }} />

                {/* Top Label */}
                {showGridLabels && (
                  <span
                    className='absolute -top-4 -translate-x-1/2 text-black text-xs'
                    style={{ left: `${gridCol.percent}%` }}
                  >
                    {isExport ? gridCol.exportValue || gridCol.value : gridCol.value}
                  </span>
                )}

                {/* Bottom Label */}
                {showGridLabels && (
                  <span
                    className='absolute -bottom-4 -translate-x-1/2 text-black text-xs'
                    style={{ left: `${gridCol.percent}%` }}
                  >
                    {isExport ? gridCol.exportValue || gridCol.value : gridCol.value}
                  </span>
                )}
              </React.Fragment>
            )
          })}

          {/* Horizontal Lines */}
          {gridRowsArray.map((gridRow) => {
            return (
              <React.Fragment key={gridRow.key}>
                <div className='absolute left-0 h-px w-full bg-black' style={{ bottom: `${gridRow.percent}%` }} />

                {/* Left Label */}
                {showGridLabels && (
                  <span
                    className='absolute -left-2 -translate-x-1/2 translate-y-1/2 text-black text-xs'
                    style={{
                      bottom: `${gridRow.percent}%`,
                      transform: 'rotate(-90deg)',
                    }}
                  >
                    {isExport ? gridRow.exportValue || gridRow.value : gridRow.value}
                  </span>
                )}

                {/* Right Label */}
                {showGridLabels && (
                  <span
                    className='absolute -right-2 translate-x-1/2 translate-y-1/2 text-black text-xs'
                    style={{ bottom: `${gridRow.percent}%`, transform: 'rotate(90deg)' }}
                  >
                    {isExport ? gridRow.exportValue || gridRow.value : gridRow.value}
                  </span>
                )}
              </React.Fragment>
            )
          })}
        </>
      )
    },
    [gridColsArray, gridRowsArray, copyLocationType],
  )

  return (
    <div className='relative'>
      <Dialog
        className={classNames('print-map-dialog', className)}
        open={open}
        onClose={(_event, reason) => {
          if (reason !== 'backdropClick') {
            onClose()
          }
        }}
        slotProps={{
          paper: {
            className: 'w-[64rem] !max-w-none lg:h-[39.25rem] !m-6',
          },
        }}
      >
        <DialogTitle className='flex items-center gap-2 py-3! max-lg:px-5!'>
          <Typography className='flex-1 text-md! leading-5!'>{printDetails?.displayDialogTitle || ''}</Typography>
        </DialogTitle>
        <DialogContent className='flex h-full w-full flex-col justify-between bg-white px-10! py-5!'>
          {loading ? (
            <div className='flex h-full w-full items-center justify-center'>
              <CircularProgress />
            </div>
          ) : (
            <Box className='flex h-full w-full flex-col justify-center'>
              <Box className='flex w-full items-stretch gap-5 max-lg:flex-col lg:gap-6'>
                <Box className='relative aspect-738/473 w-full flex-1 border border-black border-solid p-4 text-[0] lg:max-h-118.25 lg:p-6'>
                  <Box
                    id={`${id}-map-export-container`}
                    className={classNames(
                      '[&_.maplibregl-compact]:!box-border [&_.maplibregl-compact]:!h-4 [&_.maplibregl-compact]:!min-h-0 [&_.maplibregl-compact]:!pr-4 [&_.maplibregl-ctrl-attrib-button]:!h-4 [&_.maplibregl-ctrl-attrib-button]:!w-4 [&_.maplibregl-ctrl-attrib-button]:!bg-contain [&_.maplibregl-ctrl-bottom-right]:!z-[0] [&_.maplibregl-ctrl-scale]:!mb-0 flex h-full w-full [&_.map-tools]:hidden [&_.maplibregl-compact]:flex [&_.maplibregl-compact]:items-center [&_.maplibregl-ctrl-attrib-inner]:mr-1 [&_.maplibregl-ctrl-attrib-inner]:text-[0.375rem] [&_.maplibregl-ctrl-attrib-inner]:leading-3',
                    )}
                  >
                    <MapView
                      isShowOpenBtn={false}
                      isShowLayerDetailsBtn={false}
                      isShowBasicTools={false}
                      mapId={`${id}-${MAP_EXPORT}`}
                      isPaddingGoogle={false}
                      isHideAttributionControl={true}
                      zoomStyle={2}
                    />
                  </Box>

                  {getGridElement(false)}
                </Box>

                <Box className='flex w-full flex-col lg:w-[22%]'>
                  <Box className='relative aspect-215/287 w-full shrink-0'>
                    <Box
                      id={`${id}-mini-map-export-container`}
                      className='[&_.maplibregl-compact]:!mr-[0.25rem] [&_.maplibregl-compact]:!box-border [&_.maplibregl-compact]:!h-4 [&_.maplibregl-compact]:!min-h-0 [&_.maplibregl-compact]:!pr-4 [&_.maplibregl-ctrl-attrib-button]:!h-4 [&_.maplibregl-ctrl-attrib-button]:!w-4 [&_.maplibregl-ctrl-attrib-button]:!bg-contain flex h-full w-full [&_.map-tools]:hidden [&_.maplibregl-compact]:flex [&_.maplibregl-compact]:items-center [&_.maplibregl-ctrl-attrib-inner]:mr-1 [&_.maplibregl-ctrl-attrib-inner]:text-[0.375rem] [&_.maplibregl-ctrl-scale]:hidden'
                    >
                      <MapView
                        isShowOpenBtn={false}
                        isShowLayerDetailsBtn={false}
                        isShowBasicTools={false}
                        mapId={`${id}-${MINI_MAP_EXPORT}`}
                        isInteractive={false}
                        isHideAttributionControl={true}
                        zoomStyle={is2K ? 2 : undefined}
                      />
                    </Box>

                    <Box className='absolute top-1.25 right-1.25'>
                      <MiniMapCompassIcon
                        width={is2K ? 64 : 32}
                        height={is2K ? 64 : 32}
                        fill={basemap === BasemapType.CartoLight ? 'black' : 'white'}
                      />
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
                          <Typography className='! flex-1 text-black text-xs!'>
                            {t('tools.printMap.orgName')}
                          </Typography>

                          <Typography className='flex-1 font-bold! text-black text-xs!'>
                            {printDetails?.organization?.[language as keyof typeof printDetails.organization]}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                    <Box className='flex w-full flex-col items-center gap-1'>
                      <Image
                        src='/images/logo_iris.png'
                        alt='IRIS Logo'
                        width={70}
                        height={20}
                        className='h-5 w-auto'
                        unoptimized
                        priority
                      />
                      <Typography className='text-center text-[#1E1E1E] text-[0.625rem]! lg:text-[0.5rem]!'>
                        {t('app.name')}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>

              <Box className='mt-4 flex w-full gap-5 lg:gap-6'>
                <Box className='flex-1'>
                  <Typography className='font-bold text-[0.625rem] text-black sm:text-[0.625rem] lg:text-[0.625rem]'>
                    {t('tools.printMap.coordinateType')}:{' '}
                    {!copyLocationType || copyLocationType === 'DD' ? 'GCS' : copyLocationType}
                  </Typography>
                </Box>
                <Box className='hidden lg:block lg:w-[22%]'></Box>
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
          'hidden-dialog !z-[-9999] [&_.MuiBackdrop-root]:!opacity-0 [&_.MuiDialog-container]:!absolute [&_.MuiDialog-container]:!left-[-625rem] [&_.MuiDialog-container]:!top-[-625rem]',
          className,
        )}
        open={open}
        onClose={(_event, reason) => {
          if (reason !== 'backdropClick') {
            onClose()
          }
        }}
        slotProps={{
          paper: {
            className:
              '!max-w-[64rem] !min-w-[64rem] !w-[64rem] !min-h-[39.25rem] !max-h-[39.25rem] !h-[39.25rem] !m-6  ',
          },
        }}
      >
        <DialogTitle className='flex items-center gap-2 py-3!'>
          <Typography className='flex-1 text-md! leading-5!'>{printDetails?.displayDialogTitle}</Typography>
        </DialogTitle>
        <DialogContent className='flex h-full w-full flex-col justify-between bg-white px-10! py-5!'>
          <Box className='flex h-full w-full flex-col justify-center'>
            <Box className='flex w-full items-stretch gap-6'>
              <Box className='relative aspect-738/473 max-h-118.25 w-full flex-1 border border-black border-solid p-6 text-[0]'>
                <Box className='captured-map-image h-full w-full object-contain' component='img' alt='Map Image' />

                {/* Map's legend */}

                {basemap === BasemapType.GoogleHybrid ||
                  (basemap === BasemapType.GoogleSatellite && (
                    <Image
                      src={'/images/map/google_on_non_white_hdpi.png'}
                      width={59}
                      height={18}
                      className={classNames(`absolute bottom-8 left-[calc(50%-1.85rem)] z-9 md:bottom-8`)}
                      alt={`Google Logo`}
                      unoptimized
                      priority
                    />
                  ))}
                {getGridElement(true)}
              </Box>

              <Box className='flex w-[22%] flex-col'>
                <Box className='relative aspect-215/287 w-full shrink-0'>
                  <Box
                    className='captured-mini-map-image h-full w-full object-contain'
                    component='img'
                    alt='Mini Map Image'
                  />

                  <Box className='absolute top-1.25 right-1.25'>
                    <MiniMapCompassIcon fill={basemap === BasemapType.CartoLight ? 'black' : 'white'} />
                  </Box>

                  {basemap === BasemapType.GoogleHybrid ||
                    (basemap === BasemapType.GoogleSatellite && (
                      <Image
                        src={'/images/map/google_on_non_white_hdpi.png'}
                        width={59}
                        height={18}
                        className={classNames(`absolute bottom-2 left-[calc(50%-1.85rem)] z-9 md:bottom-2`)}
                        alt={`Google Logo`}
                        unoptimized
                        priority
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
                    {printDetails && printDetails.organization !== null && (
                      <Box className='flex w-full flex-row gap-2'>
                        <Typography className='! flex-1 text-black text-xs!'>{t('tools.printMap.orgName')}</Typography>
                        <Typography className='flex-1 font-bold! text-black text-xs!'>
                          {printDetails?.organization?.[language as keyof typeof printDetails.organization]}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  <Box className='flex w-full flex-col items-center gap-1'>
                    <Image
                      src='/images/logo_iris.png'
                      alt='IRIS Logo'
                      width={70}
                      height={20}
                      className='h-5 w-auto'
                      unoptimized
                      priority
                    />
                    <Typography className='text-center text-[#1E1E1E] text-[0.625rem]! lg:text-[0.5rem]!'>
                      {t('app.name')}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>

            <Box className='mt-4 flex w-full gap-6'>
              <Box className='flex-1'>
                <Typography className='font-bold text-[0.625rem] text-black sm:text-[0.625rem] lg:text-[0.625rem]'>
                  {t('tools.printMap.coordinateType')}:{' '}
                  {!copyLocationType || copyLocationType === 'DD' ? 'GCS' : copyLocationType}
                </Typography>
              </Box>
              <Box className='w-[22%]'></Box>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PrintMapDialog
