/** biome-ignore-all lint/a11y/useSemanticElements: <explanation> */
'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { IconButton, Tooltip } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import InboxIcon from '@mui/icons-material/Inbox'
import ms from 'milsymbol'
import { AnnotationItem, AnnotationLabelItem } from '@interfaces/entities'
import { useTranslation } from 'react-i18next'
import { cropCanvasImage } from '@/utils/crop-image'
import useResponsive from '@/hook/responsive'
import Empty from '@/components/common/empty'

const getSymbolUrlAsync = (sidc: string, annotationLabel: AnnotationLabelItem, size: number): Promise<string> => {
  try {
    const cleanProperties = Object.fromEntries(
      Object.entries(annotationLabel).map(([key, value]) => [key, value ?? undefined]),
    )
    const properties = { ...cleanProperties, size: size }
    const sym = new ms.Symbol(sidc, properties)
    const { width, height } = sym.getSize()

    // Create canvas
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')

    if (!ctx) return Promise.resolve('')

    // Draw SVG to canvas
    const svgString = sym.asSVG()
    const svg = new Blob([svgString], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(svg)
    const img = new globalThis.Image(width, height)

    return new Promise<string>((resolve) => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0)

        // Crop left/right
        const croppedCanvas = cropCanvasImage(canvas, false)
        const dataUrl = croppedCanvas.toDataURL()

        URL.revokeObjectURL(url)
        resolve(dataUrl)
      }

      img.onerror = () => {
        console.error('Error loading symbol image for item')
        URL.revokeObjectURL(url)
        resolve('')
      }

      img.src = url
    })
  } catch (error) {
    console.error('Error generating symbol icon:', error)
    return Promise.resolve('')
  }
}

const ItemsList: React.FC<{
  itemList: AnnotationItem[]
  onDelete?: (id: string) => void
  onEdit?: (id: string) => void
  onItemClick?: (item: AnnotationItem) => void
}> = ({ itemList, onDelete, onEdit, onItemClick }) => {
  const [itemsWithIcon, setItemsWithIcon] = useState<(AnnotationItem & { iconUrl: string })[]>([])
  const { t } = useTranslation('common')
  const { is2K } = useResponsive()

  // Generate symbol URLs asynchronously
  useEffect(() => {
    const generateUrls = async () => {
      const items = await Promise.all(
        itemList.map(async (item) => ({
          ...item,
          iconUrl: await getSymbolUrlAsync(
            item.sidc,
            item?.annotationLabel || {},
            item.annotationSymbol?.symbolSize || 40,
          ),
        })),
      )
      setItemsWithIcon(items)
    }

    generateUrls()
  }, [itemList])

  const handleEdit = (id: string) => {
    onEdit?.(id)
  }

  const handleDelete = (id: string) => {
    onDelete?.(id)
  }

  if (itemsWithIcon.length === 0) {
    return (
      <div className='flex h-full flex-col items-center justify-center gap-2 py-6'>
        <Empty message={t('empty.noList')} />
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-2'>
      {itemsWithIcon.map((item) => (
        <div
          key={item.id}
          role='button'
          tabIndex={0}
          className='flex w-full cursor-pointer items-center justify-between bg-(--color-background-light) px-3 py-2 hover:bg-(--color-background-dark) hover:text-white'
          onClick={() => onItemClick?.(item)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onItemClick?.(item)
            }
          }}
        >
          <div className='flex items-center gap-2 overflow-hidden'>
            {item.iconUrl && (
              <Image
                src={item.iconUrl}
                alt={item.id}
                style={{ width: '1.25rem' }}
                width={20}
                height={20}
                className='shrink-0'
              />
            )}
            <p className='truncate font-medium text-sm'>{item.annotationSymbol?.icon?.name}</p>
          </div>
          <div className='flex items-center gap-0'>
            <Tooltip title={t('button.edit')}>
              <IconButton
                size='small'
                color='primary'
                onClick={(e) => {
                  e.stopPropagation()
                  handleEdit(item.id)
                }}
              >
                <EditIcon fontSize='small' />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('button.delete')}>
              <IconButton
                size='small'
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(item.id)
                }}
                color='error'
              >
                <DeleteIcon fontSize='small' />
              </IconButton>
            </Tooltip>
          </div>
        </div>
      ))}
    </div>
  )
}

export default ItemsList
