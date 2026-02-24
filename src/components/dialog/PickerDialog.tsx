'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material'
import SearchWrapper, { FilterFieldConfig } from '@/components/layout/SearchWrapper'
import { MuiTableColumn } from '@/components/common/display/MuiTableHOC'
import { SortType } from '@interfaces/config'

interface PickerDialogProps<T extends { id: string | number }> {
  open: boolean
  title?: string
  columns: MuiTableColumn<T>[]
  filtersConfig: FilterFieldConfig[]
  onSearch: (
    filters: Record<string, string>,
    page: number,
    rowsPerPage: number,
    sortState: { orderBy: string; order: SortType },
  ) => Promise<{ rows: T[]; totalRows: number }>
  onClose: () => void
  onConfirm: (selected: T[]) => void
  initialSelectedIds?: (string | number)[]
  initialFilters?: Record<string, string>
  initialRowsPerPage?: number
  initialSort?: { orderBy: string; order: SortType }
  /** Optional predicate to mark rows unselectable. Return false to disable selection for a row */
  isRowSelectable?: (row: T) => boolean
}

export default function PickerDialog<T extends { id: string | number }>({
  open,
  title,
  columns,
  filtersConfig,
  onSearch,
  onClose,
  onConfirm,
  initialSelectedIds,
  initialFilters,
  initialRowsPerPage = 10,
  initialSort,
  isRowSelectable,
}: Readonly<PickerDialogProps<T>>) {
  const { t } = useTranslation('common')
  // normalize defaults inside the body to avoid new object/array identity each render
  const initialSelectedIdsVal = initialSelectedIds ?? []
  const initialFiltersVal = initialFilters ?? {}
  const initialSortVal = initialSort ?? { orderBy: '', order: SortType.ASC }

  // selection controlled here
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>(initialSelectedIdsVal)
  // map of loaded rows by id so we can return full objects on confirm
  const [loadedMap, setLoadedMap] = useState<Record<string, T>>({})
  // update loadedMap whenever SearchWrapper asks for data so we can return full objects on confirm
  const wrappedOnSearch = useCallback(
    async (
      filters: Record<string, string>,
      page?: number,
      rowsPerPage?: number,
      sortState?: { orderBy: string; order: SortType },
    ) => {
      const res = await onSearch(filters, page!, rowsPerPage!, sortState!)
      setLoadedMap((prev) => {
        const copy = { ...prev }
        for (const r of res.rows) copy[String(r.id)] = r
        return copy
      })
      return res
    },
    [onSearch],
  )

  const handleConfirm = () => {
    const selectedRows: T[] = selectedIds.map((id) => loadedMap[String(id)]).filter(Boolean)
    onConfirm(selectedRows)
  }

  // reset selection whenever the dialog is opened
  // also update when initialSelectedIds changes while open
  useEffect(() => {
    if (open) {
      setSelectedIds(initialSelectedIds || [])
    }
  }, [open, initialSelectedIds])

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='xl'>
      <DialogTitle>{title || t('dialog.pickerTitle')}</DialogTitle>
      <DialogContent className='p-0!'>
        <SearchWrapper
          columns={columns}
          filtersConfig={filtersConfig}
          onSearch={wrappedOnSearch}
          initialFilters={initialFiltersVal}
          initialRowsPerPage={initialRowsPerPage}
          initialSort={initialSortVal}
          selectedRowKeys={selectedIds}
          onSelectionChange={(next) => setSelectedIds(next)}
          isRowSelectable={isRowSelectable}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color='inherit'>
          {t('button.cancel')}
        </Button>
        <Button onClick={handleConfirm} color='primary' variant='contained'>
          {t('button.select')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
