/** biome-ignore-all lint/a11y/useSemanticElements: <explanation> */
'use client'

import React, { useMemo } from 'react'
import Image from 'next/image'
import { IconButton, Tooltip } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import InboxIcon from '@mui/icons-material/Inbox'
import ms from 'milsymbol'
import { AnnotationItem, AnnotationLabelItem } from '@interfaces/entities'
import { useTranslation } from 'react-i18next'

const getSymbolUrl = (sidc: string, annotationLabel: AnnotationLabelItem, size: number) => {
  try {
    const cleanProperties = Object.fromEntries(
      Object.entries(annotationLabel).map(([key, value]) => [key, value ?? undefined]),
    )
    const properties = { ...cleanProperties, size: size }
    const sym = new ms.Symbol(sidc, properties)
    return sym.toDataURL()
  } catch (error) {
    console.error('Error generating symbol icon:', error)
    return ''
  }
}

const ItemsList: React.FC<{
  itemList: AnnotationItem[]
  onDelete?: (id: string) => void
  onEdit?: (id: string) => void
  onItemClick?: (item: AnnotationItem) => void
}> = ({ itemList, onDelete, onEdit, onItemClick }) => {
  const itemsWithIcon = useMemo(
    () =>
      itemList.map((item) => ({
        ...item,
        iconUrl: getSymbolUrl(item.sidc, item?.annotationLabel || {}, item.annotationSymbol?.symbolSize || 40),
      })),
    [itemList],
  )
  const { t } = useTranslation('common')

  const handleEdit = (id: string) => {
    onEdit?.(id)
  }

  const handleDelete = (id: string) => {
    onDelete?.(id)
  }

  if (itemsWithIcon.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 py-6'>
        <InboxIcon className='text-(--color-gray-border)' sx={{ fontSize: 60 }} />
        <p className='text-center text-[#B3B5B3] text-sm'>ไม่มีรายการวาด</p>
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
            {item.iconUrl && <Image src={item.iconUrl} alt={item.id} width={20} height={20} className='shrink-0' />}
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
