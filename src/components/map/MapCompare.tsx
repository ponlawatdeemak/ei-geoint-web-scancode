'use client'

import React, { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import Compare from '@maplibre/maplibre-gl-compare'
import '@maplibre/maplibre-gl-compare/dist/maplibre-gl-compare.css'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Button, Chip } from '@mui/material'
import { useTranslation } from 'react-i18next'
import PinnedDateChip from '../shared/ProjectMapView/weekly/PinnedDateChip'
import useMapStore from '@/components/common/map/store/map'
import { layerIdConfig } from '@/components/common/map/config/map'

export enum CompareType {
  right = 'right',
  left = 'left',
}

export type MapCompareProps = {
  leftMapStyle?: string | maplibregl.StyleSpecification
  rightMapStyle?: string | maplibregl.StyleSpecification
  leftMapLabel?: string
  rightMapLabel?: string
  onLeftMapLoad?: (map: maplibregl.Map) => void
  onRightMapLoad?: (map: maplibregl.Map) => void
  onLeftMapStyleData?: (event: maplibregl.MapStyleDataEvent) => void
  onRightMapStyleData?: (event: maplibregl.MapStyleDataEvent) => void
  isPinned?: boolean
  onDelete?: (compareType: CompareType) => void
  isMobile?: boolean
  onSelectLeftMap?: () => void
  onSelectRightMap?: () => void
}

const MapCompare: React.FC<MapCompareProps> = ({
  leftMapStyle,
  rightMapStyle,
  leftMapLabel,
  rightMapLabel,
  onLeftMapLoad,
  onRightMapLoad,
  onLeftMapStyleData,
  onRightMapStyleData,
  isPinned = false,
  onDelete,
  isMobile = false,
  onSelectLeftMap,
  onSelectRightMap,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const leftContainerRef = useRef<HTMLDivElement | null>(null)
  const rightContainerRef = useRef<HTMLDivElement | null>(null)
  const { t } = useTranslation('common')

  useEffect(() => {
    if (!containerRef.current || !leftContainerRef.current || !rightContainerRef.current) {
      return
    }
    const leftMap = new maplibregl.Map({
      container: leftContainerRef.current,
      style: leftMapStyle,
    })
    const rightMap = new maplibregl.Map({
      container: rightContainerRef.current,
      style: rightMapStyle,
    })

    const onStyleData = (event: maplibregl.MapStyleDataEvent) => {
      const map = event.target

      if (!map.getSource('custom-referer-source')) {
        map.addSource('custom-referer-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })
      }
      if (!map.getLayer(layerIdConfig.customReferer)) {
        map.addLayer({
          id: layerIdConfig.customReferer,
          type: 'symbol',
          source: 'custom-referer-source',
          layout: { visibility: 'none' },
        })
      }

      if (!map.getSource('basic-tools-source')) {
        map.addSource('basic-tools-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })
      }
      if (!map.getLayer(layerIdConfig.basicTools)) {
        map.addLayer({
          id: layerIdConfig.basicTools,
          type: 'symbol',
          source: 'basic-tools-source',
          layout: { visibility: 'none' },
        })
      }

      try {
        useMapStore.getState().callStyleDataHandlers(map)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('callStyleDataHandlers failed', e)
      }
    }

    leftMap.on('styledata', onStyleData)
    rightMap.on('styledata', onStyleData)
    const compare = new Compare(leftMap, rightMap, containerRef.current, {
      orientation: 'vertical',
    })
    if (onLeftMapLoad) {
      leftMap.on('load', () => onLeftMapLoad(leftMap))
    }
    if (onLeftMapStyleData) {
      leftMap.on('styledata', onLeftMapStyleData)
    }
    if (onRightMapLoad) {
      rightMap.on('load', () => onRightMapLoad(rightMap))
    }
    if (onRightMapStyleData) {
      rightMap.on('styledata', onRightMapStyleData)
    }
    return () => {
      leftMap?.remove()
      rightMap?.remove()
      compare?.remove()
    }
  }, [leftMapStyle, rightMapStyle, onLeftMapLoad, onRightMapLoad, onLeftMapStyleData, onRightMapStyleData])

  return (
    <div ref={containerRef} className='relative h-full w-full'>
      <div ref={leftContainerRef} className='absolute! top-0 bottom-0 w-full'>
        {leftMapLabel && !isPinned ? (
          <Chip
            label={leftMapLabel}
            className='absolute top-4 left-1/4 z-10 w-[178px] -translate-x-1/2 select-none sm:w-[184px] md:w-auto'
          />
        ) : leftMapLabel && isPinned ? (
          <div className='absolute top-4 left-1/4 z-10 w-[178px] -translate-x-1/2 select-none sm:w-[184px] md:w-auto'>
            <PinnedDateChip
              date={leftMapLabel || ''}
              onDelete={() => {
                onDelete?.(CompareType.left)
              }}
            ></PinnedDateChip>
          </div>
        ) : null}
        {!leftMapLabel && (
          <div className='absolute inset-0 z-1 justify-center bg-black/50'>
            <div className='bottom-0 left-0 flex h-full w-1/2 flex-col items-center justify-center text-center text-white'>
              <div className='text-sm'>{`${t('map.weeklyCompare.selectImageDate')}${t('map.weeklyCompare.leftImage')}`}</div>
              <div className='text-sm'> {t('map.weeklyCompare.compareImage')}</div>
              {isMobile && (
                <div className='relative z-10 mt-2'>
                  <Button
                    variant='contained'
                    className='border-(--color-gray-border)!'
                    onClick={() => {
                      onSelectLeftMap?.()
                    }}
                  >
                    {t('map.weeklyCompare.selectImageDate')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div ref={rightContainerRef} className='absolute! top-0 bottom-0 w-full'>
        {rightMapLabel && !isPinned ? (
          <Chip
            label={rightMapLabel}
            className='absolute top-4 right-1/4 z-10 w-[178px] translate-x-1/2 select-none sm:w-[184px] md:w-auto'
          />
        ) : rightMapLabel && isPinned ? (
          <div className='absolute top-4 right-1/4 z-10 w-[178px] translate-x-1/2 select-none sm:w-[184px] md:w-auto'>
            <PinnedDateChip
              date={rightMapLabel || ''}
              onDelete={() => {
                onDelete?.(CompareType.right)
              }}
            ></PinnedDateChip>
          </div>
        ) : null}
        {!rightMapLabel && (
          <div className='absolute inset-0 z-1 flex justify-end bg-black/50'>
            <div className='flex h-full w-1/2 flex-col items-center justify-center text-center text-white'>
              <div className='text-sm'>{`${t('map.weeklyCompare.selectImageDate')}${t('map.weeklyCompare.rightImage')}`}</div>
              <div className='text-sm'> {t('map.weeklyCompare.compareImage')}</div>
              {isMobile && (
                <div className='relative z-10 mt-2'>
                  <Button
                    variant='contained'
                    className='border-(--color-gray-border)!'
                    onClick={() => {
                      onSelectRightMap?.()
                    }}
                  >
                    {t('map.weeklyCompare.selectImageDate')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MapCompare
