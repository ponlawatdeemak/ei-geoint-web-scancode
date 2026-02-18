
import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import service from '@/api'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import type { SearchProjectResultItem } from '@interfaces/index'
import type { ErrorResponse } from '@interfaces/dto/core'

interface UseProjectActionsProps {
  setSearchTrigger: React.Dispatch<React.SetStateAction<number>>
}

export const useProjectActions = ({ setSearchTrigger }: UseProjectActionsProps) => {
  const router = useRouter()
  const { showLoading, hideLoading, showAlert } = useGlobalUI()

  const deleteMany = useCallback(
    (ids: string[], onComplete?: () => void) => {
      showAlert({
        status: 'confirm-delete',
        showCancel: true,
        onConfirm: async () => {
          showLoading()
          try {
            await service.projects.delete({ ids })
            onComplete?.()
            setSearchTrigger((prev) => prev + 1) // trigger re-search
          } catch (err) {
            const error = err as ErrorResponse
            showAlert({
              status: 'error',
              errorCode: error?.message,
            })
          } finally {
            hideLoading()
          }
        },
      })
    },
    [showAlert, showLoading, hideLoading, setSearchTrigger],
  )

  const handleEdit = useCallback(
    (row: SearchProjectResultItem | null) => {
      const id = row?.id
      if (id) router.push(`/project/${id}`)
    },
    [router],
  )

  const handleDelete = useCallback(
    (row: SearchProjectResultItem | null, onComplete?: () => void) => {
      const id = row?.id
      if (id) deleteMany([String(id)], onComplete)
    },
    [deleteMany],
  )

  const handleMultiDelete = useCallback(
    (selectedRowKeys: (string | number)[], onComplete?: () => void) => {
      deleteMany(selectedRowKeys as string[], onComplete)
    },
    [deleteMany],
  )

  return {
    deleteMany,
    handleEdit,
    handleDelete,
    handleMultiDelete,
    router, // export router if needed by consumer
  }
}
