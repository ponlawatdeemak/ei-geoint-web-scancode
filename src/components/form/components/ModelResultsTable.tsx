'use client'

import React, { useMemo, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Checkbox, Table, TableHead, TableRow, TableCell, TableBody, TableSortLabel } from '@mui/material'
import { useSettings } from '@/hook/useSettings'
import { formatDateTime } from '@/utils/formatDate'
import { GetResultImageDtoOut } from '@interfaces/index'
import { Language, SortType } from '@interfaces/config'
import type { ModelResult } from '../hooks/types'

interface ModelResultRow {
  mappingModelId?: number
  taskId: number
  resultId?: number
  processAt?: string
  rootModel: { name?: string; nameEn?: string }
  model: { name?: string; nameEn?: string }
  project: { name?: string }
}

interface ColumnDef {
  id: string
  label: string
  className: string
  sortable: boolean
  align?: 'left' | 'right' | 'center'
  render: (row: ModelResultRow) => string
}

interface ModelResultsTableProps {
  slot: number
  modelId: number
  image: GetResultImageDtoOut
  selectedModelResults: ModelResult[]
  onSelectModelResult: (mr: ModelResult) => void
  loading?: boolean
  viewOnly?: boolean
}

function getLocalizedName(item: { name?: string; nameEn?: string } | undefined, lang: string): string {
  if (!item) return ''
  return (lang === Language.TH ? item.name : item.nameEn) ?? ''
}

function getSortValue(row: ModelResultRow, key: string, lang: string): string | number {
  switch (key) {
    case 'model':
      return getLocalizedName(row.rootModel, lang)
    case 'feature':
      return getLocalizedName(row.model, lang)
    case 'processAt':
      return row.processAt ? new Date(row.processAt).getTime() : 0
    case 'project':
      return row.project?.name ?? ''
    default:
      return ''
  }
}

function compareValues(va: string | number, vb: string | number, ord: SortType): number {
  if (typeof va === 'number' && typeof vb === 'number') {
    return ord === SortType.ASC ? va - vb : vb - va
  }
  const sa = String(va).toLowerCase()
  const sb = String(vb).toLowerCase()
  if (sa === sb) return 0
  return (sa < sb ? -1 : 1) * (ord === SortType.ASC ? 1 : -1)
}

const ModelResultsTable: React.FC<ModelResultsTableProps> = ({
  slot,
  modelId,
  image,
  selectedModelResults,
  onSelectModelResult,
  loading,
  viewOnly,
}) => {
  const { t } = useTranslation('common')
  const { language } = useSettings()

  const [sortState, setSortState] = useState<{ orderBy: string; order: SortType }>({
    orderBy: 'processAt',
    order: SortType.DESC,
  })

  const columns: ColumnDef[] = useMemo(
    () => [
      {
        id: 'model',
        label: t('form.taskForm.modelResultColumn.model'),
        className: 'min-w-32',
        sortable: true,
        render: (row: ModelResultRow) => getLocalizedName(row.rootModel, language),
      },
      {
        id: 'feature',
        label: t('form.taskForm.modelResultColumn.feature'),
        className: 'min-w-20',
        sortable: true,
        render: (row: ModelResultRow) => getLocalizedName(row.model, language),
      },
      {
        id: 'processAt',
        label: t('form.taskForm.modelResultColumn.processAt'),
        className: 'min-w-40',
        sortable: true,
        render: (row: ModelResultRow) => (row.processAt ? formatDateTime(row.processAt, language) : ''),
      },
      {
        id: 'project',
        label: t('form.taskForm.modelResultColumn.project'),
        className: 'min-w-40',
        sortable: true,
        render: (row: ModelResultRow) => row.project?.name ?? '',
      },
    ],
    [t, language],
  )

  const handleSortChange = useCallback((orderBy: string, order: SortType) => {
    setSortState({ orderBy, order })
  }, [])

  const results = useMemo(() => {
    const rows = ((image.modelResult ?? []) as ModelResultRow[]).filter((row) => row.mappingModelId === modelId)
    const { orderBy, order } = sortState
    if (!orderBy) return rows

    return [...rows].sort((a, b) => {
      const va = getSortValue(a, orderBy, language)
      const vb = getSortValue(b, orderBy, language)
      return compareValues(va, vb, order)
    })
  }, [image.modelResult, modelId, sortState, language])

  const isRowChecked = useCallback(
    (row: ModelResultRow) =>
      selectedModelResults.some(
        (mr) =>
          mr.comparisonsTypeId === slot + 1 &&
          mr.groupModelId === (row.mappingModelId ?? 0) &&
          mr.selectResultTaskId === String(row.taskId) &&
          mr.resultId === String(row.resultId ?? 0),
      ),
    [selectedModelResults, slot],
  )

  return (
    <Table stickyHeader>
      <TableHead>
        <TableRow>
          <TableCell className='bg-white!' padding='checkbox'></TableCell>
          {columns.map((col) => (
            <TableCell
              key={col.id}
              className={`bg-white! ${col.className}`}
              align={col.align ?? 'left'}
              sortDirection={sortState.orderBy === col.id ? sortState.order : false}
            >
              {col.sortable ? (
                <TableSortLabel
                  active={sortState.orderBy === col.id}
                  direction={sortState.orderBy === col.id ? sortState.order : SortType.ASC}
                  onClick={() => {
                    const isAsc = sortState.orderBy === col.id && sortState.order === SortType.ASC
                    handleSortChange(col.id, isAsc ? SortType.DESC : SortType.ASC)
                  }}
                >
                  {col.label}
                </TableSortLabel>
              ) : (
                col.label
              )}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {results.map((row, idx) => (
          <TableRow key={idx} className={idx % 2 === 0 ? 'bg-(--color-background-default)' : ''}>
            <TableCell padding='checkbox'>
              <Checkbox
                checked={isRowChecked(row)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onSelectModelResult({
                      comparisonsTypeId: slot + 1,
                      groupModelId: row.mappingModelId ?? 0,
                      selectResultTaskId: String(row.taskId),
                      resultId: String(row.resultId ?? 0),
                    })
                  }
                }}
                disabled={loading || results.length === 1 || viewOnly}
              />
            </TableCell>
            {columns.map((col) => (
              <TableCell key={col.id} align={col.align ?? 'left'}>
                {col.render(row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default ModelResultsTable
