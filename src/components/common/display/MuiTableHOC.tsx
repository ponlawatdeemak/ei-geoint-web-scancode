'use client'

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  IconButton,
  TablePagination,
  TableSortLabel,
  Divider,
  Typography,
  Button,
  Tooltip,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { SortType } from '@interfaces/config'

export interface MuiTableColumn<T> {
  id: string
  className?: string
  label: string
  align?: 'right' | 'left' | 'center'
  render?: (
    row: T,
    helpers: {
      rowKey: (row: T) => string | number
      removeKeysFromSelection: (keys: (string | number)[]) => void
      onEdit?: (row: T) => void
      onDelete?: (row: T, onComplete?: () => void) => void
    },
  ) => React.ReactNode
  sortable?: boolean
}

export interface MuiTableHOCProps<T> {
  totalLabel?: string
  columns: MuiTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string | number
  page?: number
  rowsPerPage?: number
  totalRows?: number
  onPageChange?: (page: number) => void
  onRowsPerPageChange?: (rowsPerPage: number) => void
  onEdit?: (row: T) => void
  onDelete?: (row: T, onComplete?: () => void) => void
  onMultiDelete?: (selectedRowKeys: (string | number)[], onComplete?: () => void) => void
  onRowClick?: (row: T) => void
  sortState?: { orderBy: string; order: SortType }
  onSortChange?: (orderBy: string, order: SortType) => void
  /** Return true if a given row is selectable (checkbox enabled). By default all rows are selectable. */
  isRowSelectable?: (row: T) => boolean
  /**
   * Optional controlled selection keys. If provided, selection becomes controlled
   * by the parent and `onSelectionChange` will be called on changes.
   */
  selectedRowKeys?: (string | number)[]
  /**
   * Called when selection changes. Receives the new array of selected keys.
   */
  onSelectionChange?: (selected: (string | number)[]) => void
  hidePagination?: boolean
}

function MuiTableHOC<T>({
  totalLabel = 'table.totalSearchResult',
  columns,
  rows,
  rowKey,
  page,
  rowsPerPage,
  totalRows,
  onPageChange,
  onRowsPerPageChange,
  onEdit,
  onDelete,
  onMultiDelete,
  onRowClick,
  sortState,
  onSortChange,
  isRowSelectable,
  selectedRowKeys: propSelectedRowKeys,
  onSelectionChange,
  hidePagination,
}: Readonly<MuiTableHOCProps<T>>) {
  const { t } = useTranslation('common')
  // internal selection state only used when parent does not control selection
  const [internalSelectedRowKeys, setInternalSelectedRowKeys] = useState<(string | number)[]>([])
  const selectedRowKeys = propSelectedRowKeys ?? internalSelectedRowKeys

  // fallback total count when `totalRows` prop is not provided
  const totalCount = totalRows ?? rows.length

  // Multi-page selection: selectedRowKeys persists across page changes
  const pageSelectableRowKeys = rows.filter((r) => (isRowSelectable ? isRowSelectable(r) : true)).map(rowKey)
  const allPageSelected =
    pageSelectableRowKeys.length > 0 && pageSelectableRowKeys.every((key) => selectedRowKeys.includes(key))
  const somePageSelected = pageSelectableRowKeys.some((key) => selectedRowKeys.includes(key))

  const handleSelectRow = (key: string | number, checked: boolean) => {
    const next = checked ? [...selectedRowKeys, key] : selectedRowKeys.filter((k) => k !== key)
    if (propSelectedRowKeys) {
      onSelectionChange?.(next)
    } else {
      setInternalSelectedRowKeys(next)
    }
  }

  const handleSelectAllPage = (checked: boolean) => {
    const nextSet = new Set(selectedRowKeys)
    if (checked) {
      for (const k of pageSelectableRowKeys) nextSet.add(k)
    } else {
      for (const k of pageSelectableRowKeys) nextSet.delete(k)
    }
    const next = Array.from(nextSet)
    if (propSelectedRowKeys) onSelectionChange?.(next)
    else setInternalSelectedRowKeys(next)
  }

  const handleMultiDelete = () => {
    // provide an onComplete callback so parent can notify when deletion finished
    const deletedKeys = [...selectedRowKeys]
    onMultiDelete?.(deletedKeys, () => {
      // clear selection of the deleted keys
      removeKeysFromSelection(deletedKeys)
    })
  }

  const handleClearSelection = () => {
    if (propSelectedRowKeys) onSelectionChange?.([])
    else setInternalSelectedRowKeys([])
  }

  // helper to remove one or more keys from selection
  const removeKeysFromSelection = (keysToRemove: (string | number)[]) => {
    const next = selectedRowKeys.filter((k) => !keysToRemove.includes(k))
    if (propSelectedRowKeys) onSelectionChange?.(next)
    else setInternalSelectedRowKeys(next)
  }

  // helper to safely render a cell value as ReactNode
  const renderCellValue = (row: T, colId: string): React.ReactNode => {
    const val = (row as unknown as Record<string, unknown>)[colId]
    if (val === null || val === undefined) return ''
    if (React.isValidElement(val)) return val
    try {
      if (typeof val === 'object') return ''
      return String(val as string | number | boolean)
    } catch {
      return ''
    }
  }

  const actionsColumn = columns.find((col) => col.id === 'actions')

  return (
    <Paper className='flex h-full flex-col'>
      <div
        className={`flex items-center px-4 text-(--color-background-dark) ${selectedRowKeys.length > 0 ? 'bg-(--color-action-selected)' : ''}`}
      >
        <Typography className='py-4' variant='subtitle2'>
          {selectedRowKeys.length > 0
            ? t('table.selectedRow', { count: selectedRowKeys.length })
            : t(totalLabel, { count: totalCount })}
        </Typography>
        {selectedRowKeys.length > 0 && (
          <>
            <div className='flex-1' />
            <Button onClick={handleClearSelection} color='inherit' size='small'>
              {t('button.cancel')}
            </Button>
            {onMultiDelete && (
              <Button variant='text' color='error' onClick={handleMultiDelete} size='small' endIcon={<DeleteIcon />}>
                {t('table.deleteSelectedRows')}
              </Button>
            )}
          </>
        )}
      </div>
      <Divider sx={{ borderBottomWidth: 0.5 }} />
      <TableContainer className='flex-1 overflow-auto'>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {(onMultiDelete || onSelectionChange) && (
                <TableCell className='bg-white!' padding='checkbox'>
                  <Checkbox
                    indeterminate={somePageSelected && !allPageSelected}
                    checked={allPageSelected}
                    onChange={(e) => handleSelectAllPage(e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                    disabled={pageSelectableRowKeys.length === 0}
                  />
                </TableCell>
              )}
              {columns
                .filter((col) => col.id !== 'actions')
                .map((col) => (
                  <TableCell
                    key={col.id}
                    className={`bg-white! ${col.className || ''}`}
                    align={col.align || 'left'}
                    sortDirection={sortState && sortState.orderBy === col.id ? sortState.order : false}
                  >
                    {col.sortable ? (
                      <TableSortLabel
                        active={sortState?.orderBy === col.id}
                        direction={sortState?.orderBy === col.id ? sortState.order : SortType.ASC}
                        onClick={() => {
                          if (!onSortChange) return
                          const isAsc = sortState?.orderBy === col.id && sortState.order === SortType.ASC
                          onSortChange(col.id, isAsc ? SortType.DESC : SortType.ASC)
                        }}
                      >
                        {col.label}
                      </TableSortLabel>
                    ) : (
                      col.label
                    )}
                  </TableCell>
                ))}
              {(onEdit || onDelete || actionsColumn) && (
                <TableCell className={`bg-white! ${actionsColumn?.className || 'min-w-32'}`} align='center'>
                  {actionsColumn?.label || t('table.actions')}
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => {
              const key = rowKey(row)
              return (
                <TableRow
                  key={key}
                  className={index % 2 === 0 ? 'bg-(--color-background-default)' : ''}
                  hover
                  selected={selectedRowKeys.includes(key)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  style={onRowClick ? { cursor: 'pointer' } : {}}
                >
                  {(onMultiDelete || onSelectionChange) && (
                    <TableCell padding='checkbox'>
                      {(() => {
                        const selectable = isRowSelectable ? isRowSelectable(row) : true
                        return (
                          <Checkbox
                            checked={selectedRowKeys.includes(key)}
                            onChange={(e) => handleSelectRow(key, e.target.checked)}
                            onClick={(e) => e.stopPropagation()}
                            disabled={!selectable}
                          />
                        )
                      })()}
                    </TableCell>
                  )}
                  {columns
                    .filter((col) => col.id !== 'actions')
                    .map((col) => (
                      <TableCell key={col.id} align={col.align || 'left'}>
                        {col.render
                          ? col.render(row, { rowKey, removeKeysFromSelection })
                          : renderCellValue(row, col.id)}
                      </TableCell>
                    ))}
                  {(onEdit || onDelete || actionsColumn) && (
                    <TableCell align={actionsColumn?.align || 'center'}>
                      {actionsColumn?.render ? (
                        actionsColumn.render(row, { rowKey, removeKeysFromSelection, onEdit, onDelete })
                      ) : (
                        <>
                          {onEdit && (
                            <Tooltip title={t('button.edit')} arrow>
                              <IconButton
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onEdit(row)
                                }}
                                color='primary'
                                size='small'
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          {onDelete && (
                            <Tooltip title={t('button.delete')} arrow>
                              <IconButton
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // provide onComplete callback so parent can notify when deletion finished
                                  const keyToRemove = rowKey(row)
                                  onDelete(row, () => {
                                    removeKeysFromSelection([keyToRemove])
                                  })
                                }}
                                color='error'
                                size='small'
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {/* Only show pagination when parent provided pagination props/handlers */}
      {page !== undefined &&
      rowsPerPage !== undefined &&
      totalRows !== undefined &&
      onPageChange &&
      onRowsPerPageChange &&
      !hidePagination ? (
        <>
          <Divider sx={{ borderBottomWidth: 0.3 }} />
          <TablePagination
            component='div'
            slotProps={{
              select: {
                fullWidth: false,
                className: '[&_.MuiTablePagination-select]:py-0! [&_.MuiTablePagination-select]:pr-[1.5rem]!',
              },
            }}
            labelRowsPerPage={t('table.labelRowsPerPage')}
            labelDisplayedRows={({ from, to, count }) => t('table.labelDisplayedRows', { from, to, count })}
            count={totalRows}
            page={page}
            onPageChange={(_, newPage) => onPageChange(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => onRowsPerPageChange(Number.parseInt(e.target.value, 10))}
          />
        </>
      ) : null}
    </Paper>
  )
}

export default MuiTableHOC
