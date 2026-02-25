import { Dispatch, FC, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ItvPhotoFeature, ItvPhotoLocatorTab } from '../itv-photo'
import { renderToStaticMarkup } from 'react-dom/server'
import { bluePinIcon, redPinIcon } from '@/icons'
import { Button, Dialog, DialogContent, Divider, IconButton, useMediaQuery } from '@mui/material'
import { useTranslation } from 'react-i18next'
import CloseIcon from '@mui/icons-material/Close'
import { MapView } from '@/components/common/map/MapView'
import LocatorButton from './LocatorButton'
import LocatorList from './LocatorList'
import { LocationPin } from '@mui/icons-material'
import useMapStore from '@/components/common/map/store/map'
import { LngLat } from 'maplibre-gl'
import importToVisualize from '@/api/import-to-visualize'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { UpdateItvLayerDtoIn } from '@interfaces/dto/import-to-visualize'
import { ItvFeatureProperties, ItvLayer } from '@interfaces/entities'
import { nanoid } from 'nanoid'
import theme from '@/styles/theme'
import { vectorArrayToFeatureCollection } from '@/components/shared/ProjectMapView/utils/itvConvertor'
import { Point } from 'geojson'
import useResponsive from '@/hook/responsive'

const mapId = 'itv-photo-locator'

const infoLayerId = 'photo-info-layer'
const infoSourceId = 'photo-info-source'

const drawLayerId = 'photo-draw-layer'
const drawSourceId = 'photo-draw-source'

interface PhotoLocatorProps {
  photoList: ItvPhotoFeature[]
  setPhotoList: Dispatch<SetStateAction<ItvPhotoFeature[]>>
  onClose: () => void
  layerInfo: ItvLayer
  setLayerInfo: Dispatch<SetStateAction<ItvLayer | undefined>>
}

const PhotoLocator: FC<PhotoLocatorProps> = ({ photoList, setPhotoList, onClose, layerInfo, setLayerInfo }) => {
  const { mapLibre } = useMapStore()
  const { t } = useTranslation('common')
  const { showAlert } = useGlobalUI()
  const prevCursor = useRef<string>('')
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'))
  const { is2K } = useResponsive()

  const [currentTab, setCurrentTab] = useState<ItvPhotoLocatorTab>(ItvPhotoLocatorTab.ALL)
  const [isDefineCoordinates, setIsDefineCoordinates] = useState(false)
  const [locationSelect, setLocationSelect] = useState<LngLat | null>(null)
  const [activePhotoList, setActivePhotoList] = useState<ItvPhotoFeature[]>([])
  const [showMapMobile, setShowMapMobile] = useState(false)

  const addressList = useMemo(() => photoList.filter((photo) => photo.geometry), [photoList])
  const noAddressList = useMemo(() => activePhotoList.filter((photo) => !photo.geometry), [activePhotoList])
  const selectedList = useMemo(() => {
    return noAddressList.filter((photo) => photo.selected)
  }, [noAddressList])

  useEffect(() => {
    if (!isMobile) {
      setShowMapMobile(false)
    }
  }, [isMobile])

  const mapLocator = useMemo(() => mapLibre[mapId], [mapLibre])

  const showMap = useMemo(() => {
    if (isMobile) {
      return showMapMobile
    } else {
      return true
    }
  }, [isMobile, showMapMobile])

  const redPinSvg = useMemo(() => renderToStaticMarkup(redPinIcon({ xmlns: 'http://www.w3.org/2000/svg' })), [])

  const initInfoLayer = useCallback(() => {
    if (!mapLocator) return

    const img = new Image()
    const imageId = 'photo-info-image'

    const svg = new Blob([renderToStaticMarkup(bluePinIcon({ xmlns: 'http://www.w3.org/2000/svg' }))], {
      type: 'image/svg+xml',
    })
    const url = URL.createObjectURL(svg)

    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        if (!mapLocator.hasImage(imageId)) {
          mapLocator.addImage(imageId, img, { pixelRatio: 2 })
        }

        if (!mapLocator.getSource(infoSourceId)) {
          mapLocator.addSource(infoSourceId, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          })
        }
        if (!mapLocator.getLayer(infoLayerId)) {
          mapLocator.addLayer({
            id: infoLayerId,
            type: 'symbol',
            source: infoSourceId,
            layout: {
              'icon-image': imageId,
              'icon-size': is2K ? 0.8 : 0.4,
              'icon-anchor': 'bottom',
            },
          })
        }
      } catch (error) {
        console.error('load pin error: ', error)
      }
      URL.revokeObjectURL(url)
    }
    img.src = url
  }, [mapLocator, is2K])

  const initDrawLayer = useCallback(() => {
    if (!mapLocator) return
    const img = new Image()
    const imageId = 'photo-draw-image'

    const svg = new Blob([redPinSvg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(svg)

    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        if (!mapLocator.hasImage(imageId)) {
          mapLocator.addImage(imageId, img, { pixelRatio: 2 })
        }

        if (!mapLocator.getSource(drawSourceId)) {
          mapLocator.addSource(drawSourceId, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          })
        }
        if (!mapLocator.getLayer(drawLayerId)) {
          mapLocator.addLayer({
            id: drawLayerId,
            type: 'symbol',
            source: drawSourceId,
            layout: {
              'icon-image': imageId,
              'icon-size': is2K ? 0.8 : 0.4,
              'icon-anchor': 'bottom',
            },
          })
        }
      } catch (error) {
        console.error('load pin error: ', error)
      }
      URL.revokeObjectURL(url)
    }
    img.src = url
  }, [mapLocator, is2K])

  const initMapLayer = useCallback(() => {
    initInfoLayer()
    initDrawLayer()
  }, [initInfoLayer, initDrawLayer])

  // initial address layer for select location to photo
  useEffect(() => {
    initMapLayer()
  }, [initMapLayer])

  useEffect(() => {
    if (currentTab === ItvPhotoLocatorTab.ALL) {
      setActivePhotoList(photoList)
    } else if (currentTab === ItvPhotoLocatorTab.ADDRESS) {
      setActivePhotoList(photoList.filter((photo) => photo.geometry))
    } else if (currentTab === ItvPhotoLocatorTab.NO_ADDRESS) {
      setActivePhotoList(photoList.filter((photo) => !photo.geometry))
    }
  }, [currentTab, photoList])

  const isNoAddressTab = useMemo(() => {
    return currentTab === ItvPhotoLocatorTab.NO_ADDRESS || currentTab === ItvPhotoLocatorTab.ALL
  }, [currentTab])

  const address = useMemo(() => {
    const lat = locationSelect?.lat?.toFixed(6) || '-'
    const lng = locationSelect?.lng?.toFixed(6) || '-'
    return {
      latitude: lat,
      longitude: lng,
    }
  }, [locationSelect])

  const clearAddressOnMap = useCallback(() => {
    if (!mapLocator) return
    const newPoint: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [],
    }
    const source = mapLocator.getSource(drawSourceId) as maplibregl.GeoJSONSource
    if (source) {
      source.setData(newPoint)
    }
    if (prevCursor.current) {
      mapLocator.getCanvas().style.cursor = prevCursor.current
    }
  }, [mapLocator])

  useEffect(() => {
    if (!mapLocator) return
    if (isDefineCoordinates) {
      const onMapClick = (e: maplibregl.MapLayerMouseEvent) => {
        setLocationSelect(e.lngLat)
        const newPoint: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [e.lngLat.lng, e.lngLat.lat] },
              properties: {},
            },
          ],
        }
        const source = mapLocator.getSource(drawSourceId) as maplibregl.GeoJSONSource
        if (source) {
          source.setData(newPoint)
        }
        setShowMapMobile(false)
      }
      mapLocator.on('click', onMapClick)
      const previousCursor = mapLocator.getCanvas().style.cursor
      prevCursor.current = previousCursor
      mapLocator.getCanvas().style.cursor = 'crosshair'

      return () => {
        mapLocator?.off('click', onMapClick)

        mapLocator.getCanvas().style.cursor = prevCursor.current
      }
    }
  }, [mapLocator, isDefineCoordinates])

  const onLocateAddress = useCallback(() => {
    setIsDefineCoordinates(true)
  }, [])

  const onCancelLocateAddress = useCallback(() => {
    setIsDefineCoordinates(false)
    setLocationSelect(null)
    clearAddressOnMap()
    setShowMapMobile(false)
  }, [clearAddressOnMap])

  const onLocateClick = useCallback(() => {
    if (isDefineCoordinates) {
      onCancelLocateAddress()
    } else {
      setShowMapMobile(true)
      onLocateAddress()
    }
  }, [isDefineCoordinates, onCancelLocateAddress, onLocateAddress])

  useEffect(() => {
    if (selectedList.length === 0) {
      onCancelLocateAddress()
    }
  }, [selectedList, onCancelLocateAddress])

  const onDelete = useCallback(
    (uploadIds: string[]) => {
      // ลบรายการรูปภาพที่ไม่มีตำแหน่ง
      if (!layerInfo) return
      showAlert({
        status: 'confirm-save',
        showCancel: true,
        async onConfirm() {
          const featureList = layerInfo.features.filter(
            (feature) => !uploadIds.includes(feature.photoUploadId as string),
          )
          const param: UpdateItvLayerDtoIn = {
            projectId: layerInfo.projectId,
            id: layerInfo.id,
            features: featureList,
            name: layerInfo.name,
            uploadIdListDelete: uploadIds,
          }
          try {
            await importToVisualize.updateLayer(param)
            setLayerInfo({ ...layerInfo, features: featureList })
            setPhotoList((prev) => prev.filter((photo) => !uploadIds.includes(photo.uploadId)))
            showAlert({ status: 'success', title: t('alert.saveSuccess') })
          } catch (error: any) {
            showAlert({ status: 'error', errorCode: error?.message })
          }
        },
      })
    },
    [layerInfo, t, showAlert, setLayerInfo, setPhotoList],
  )

  const onSaveAddress = useCallback(() => {
    if (!layerInfo) return
    showAlert({
      status: 'confirm-save',
      showCancel: true,
      async onConfirm() {
        const photoGroupId = selectedList.length > 1 ? nanoid() : null
        const featureList: ItvFeatureProperties[] = layerInfo.features.map((feature) => {
          const temp = { ...feature }
          const matchPhoto = selectedList.find((photo) => photo.uploadId === feature.photoUploadId)
          if (matchPhoto) {
            return {
              ...feature,
              photoGroupId,
              geometry: locationSelect
                ? { type: 'Point', coordinates: [locationSelect?.lng, locationSelect?.lat] }
                : feature.geometry,
            }
          }
          return temp
        })
        const param: UpdateItvLayerDtoIn = {
          projectId: layerInfo.projectId,
          id: layerInfo.id,
          features: featureList,
          name: layerInfo.name,
          uploadIdListLatlng: locationSelect
            ? selectedList.map((photo) => ({
                uploadId: photo.uploadId,
                latitude: locationSelect?.lat,
                longitude: locationSelect?.lng,
              }))
            : [],
        }
        try {
          await importToVisualize.updateLayer(param)
          setLayerInfo({ ...layerInfo, features: featureList })
          setPhotoList((prev) =>
            prev.map((photo) => {
              const selectedIds = selectedList.map((item) => item.id)
              if (selectedIds.includes(photo.id)) {
                const geometry = (
                  locationSelect
                    ? { type: 'Point', coordinates: [locationSelect?.lng, locationSelect?.lat] }
                    : photo.geometry
                ) as Point
                return {
                  ...photo,
                  groupId: photoGroupId,
                  geometry,
                  photoItem: { ...photo.photoItem, geometry },
                }
              }
              return photo
            }),
          )
          showAlert({
            status: 'success',
            title: t('alert.saveSuccess'),
          })
          clearAddressOnMap()
        } catch (error: any) {
          showAlert({
            status: 'error',
            errorCode: error?.message,
          })
        }
      },
    })
  }, [layerInfo, t, showAlert, setLayerInfo, setPhotoList, selectedList, locationSelect, clearAddressOnMap])

  const onPanelOpen = useCallback(() => {
    setShowMapMobile(false)
  }, [])

  useEffect(() => {
    if (!mapLocator) return

    // initial
    if (mapLocator.isStyleLoaded()) {
      initMapLayer()
    }

    const handlerId = 'itv-photo-locator-handler'
    const register = useMapStore.getState().registerStyleDataHandler
    const unregister = useMapStore.getState().unregisterStyleDataHandler

    const handler = (m: maplibregl.Map) => {
      initMapLayer()

      const infoSource = m.getSource(infoSourceId) as maplibregl.GeoJSONSource
      if (infoSource && photoList.length > 0) {
        const temp = photoList.map((item) => item.photoItem)
        const geojson: GeoJSON.FeatureCollection = vectorArrayToFeatureCollection(temp)
        infoSource.setData(geojson)
      }

      const drawSource = mapLocator.getSource(drawSourceId) as maplibregl.GeoJSONSource
      if (drawSource && locationSelect) {
        const lngLat = locationSelect
        const newPoint: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [lngLat.lng, lngLat.lat] },
              properties: {},
            },
          ],
        }
        drawSource.setData(newPoint)
      }
    }

    register(mapLocator, handlerId, handler)

    return () => {
      unregister(mapLocator, handlerId)
      if (mapLocator.getLayer(drawLayerId)) mapLocator.removeLayer(drawLayerId)
      if (mapLocator.getSource(drawSourceId)) mapLocator.removeSource(drawSourceId)
    }
  }, [mapLocator, initMapLayer, photoList, locationSelect])

  return (
    <Dialog open={true} fullScreen>
      <DialogContent className='overflow-hidden! p-0!'>
        <div className='flex h-full flex-col overflow-hidden'>
          <div className='flex h-14 items-center gap-4 bg-[#2E82D6] px-6 text-2xl text-white'>
            <IconButton size='small' onClick={onClose} className='ml-2'>
              <CloseIcon fontSize='small' sx={{ color: 'white' }} />
            </IconButton>
            <div>{t('itv.upload.locator.title')}</div>
          </div>
          <div className='flex flex-1 overflow-hidden'>
            <div
              className={`w-full p-4 lg:w-[50%] lg:p-6 ${isMobile && showMapMobile ? 'hidden' : ''} flex flex-col overflow-hidden`}
            >
              <div className='relative pt-2'>
                {isMobile && (
                  <IconButton
                    size='small'
                    onClick={() => setShowMapMobile(true)}
                    className='absolute! -top-3! -right-3! z-10!'
                  >
                    <CloseIcon fontSize='small' />
                  </IconButton>
                )}

                <LocatorButton
                  currentTab={currentTab}
                  setCurrentTab={setCurrentTab}
                  countAll={photoList.length}
                  countAddress={addressList.length}
                />
              </div>
              <Divider className='my-2! lg:my-4!' />

              <LocatorList
                currentTab={currentTab}
                activePhotoList={activePhotoList}
                setActivePhotoList={setActivePhotoList}
                onDelete={onDelete}
              />

              {isNoAddressTab && (
                <div className='mt-2 flex justify-between'>
                  <div className='flex items-center gap-2'>
                    <Button
                      variant={isDefineCoordinates ? 'contained' : 'outlined'}
                      color={isDefineCoordinates ? 'primary' : 'inherit'}
                      startIcon={<LocationPin />}
                      onClick={onLocateClick}
                      disabled={selectedList.length === 0}
                      className={isMobile ? 'w-[40px] min-w-[40px]! [&>span]:m-0!' : ''}
                    >
                      {isMobile ? '' : t('itv.upload.locator.defindCoordinates')}
                    </Button>
                    {isDefineCoordinates && (
                      <div className='flex flex-col text-sm sm:flex-row sm:gap-2 md:gap-0 md:text-base lg:flex-col xl:flex-row xl:gap-2'>
                        <div> {`${t('itv.upload.locator.latitude')}: ${address.latitude},`}</div>
                        <div>{`${t('itv.upload.locator.longitude')}: ${address.longitude}`}</div>
                      </div>
                    )}
                  </div>
                  {isDefineCoordinates && (
                    <div className='flex items-center gap-2'>
                      <Button onClick={onCancelLocateAddress} color='inherit'>
                        {t('button.cancel')}
                      </Button>
                      <Button disabled={!locationSelect} onClick={onSaveAddress} color='primary'>
                        {t('button.ok')}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className={`h-full lg:w-[50%] ${showMap ? 'w-full' : 'hidden'}`}>
              <div className={`h-full min-h-0 w-full flex-1`}>
                <MapView mapId={mapId} isShowBasicTools isShowOpenBtn={isMobile} onPanelOpen={onPanelOpen} />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default PhotoLocator
