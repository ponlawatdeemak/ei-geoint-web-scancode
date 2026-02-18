import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import service from '@/api'
import type { Task } from '@interfaces/entities'

interface UseTaskActionsProps {
  projectId: string | undefined
  setSearchTrigger: React.Dispatch<React.SetStateAction<number>>
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
}

export const useTaskActions = ({ projectId, setSearchTrigger, setLoading }: UseTaskActionsProps) => {
  const router = useRouter()
  const { showAlert } = useGlobalUI()

  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null)
  const [menuRow, setMenuRow] = useState<Task | null>(null)
  const [topMenuAnchorEl, setTopMenuAnchorEl] = useState<HTMLElement | null>(null)
  const isTopMenuOpen = Boolean(topMenuAnchorEl)

  const handleTopMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setTopMenuAnchorEl(event.currentTarget)
  }

  const handleTopMenuClose = () => {
    setTopMenuAnchorEl(null)
  }

  const handleMenuClose = useCallback(() => {
    setMenuAnchorEl(null)
    setMenuRow(null)
  }, [])

  const handleMenuEdit = useCallback(() => {
    if (menuRow?.id) router.push(`/project/${projectId}/task/${menuRow.id}`)
    handleMenuClose()
  }, [menuRow, projectId, router, handleMenuClose])

  const handleMenuOpenMap = useCallback(() => {
    if (menuRow?.id) router.push(`/project/${projectId}/task/${menuRow.id}/map`)
    handleMenuClose()
  }, [menuRow, projectId, router, handleMenuClose])

  const deleteMany = useCallback(
    (ids: string[], onComplete?: () => void) => {
      showAlert({
        status: 'confirm-delete',
        showCancel: true,
        onConfirm: async () => {
          setLoading(true)
          try {
            setMenuAnchorEl(null)
            await service.tasks.delete(ids[0])
            onComplete?.()
            setSearchTrigger((prev) => prev + 1)
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : undefined
            showAlert({
              status: 'error',
              errorCode: message,
            })
          } finally {
            setLoading(false)
          }
        },
      })
    },
    [showAlert, setLoading, setSearchTrigger],
  )

  const handleDelete = (row: Task, onComplete?: () => void) => {
    deleteMany([row.id], onComplete)
  }

  const handleMenuDelete = useCallback(() => {
    if (!menuRow?.id) return handleMenuClose()
    deleteMany([menuRow.id], handleMenuClose)
  }, [menuRow, handleMenuClose, deleteMany])

  return {
    menuAnchorEl,
    menuRow,
    topMenuAnchorEl,
    isTopMenuOpen,
    setMenuRow,
    setMenuAnchorEl,
    handleTopMenuOpen,
    handleTopMenuClose,
    handleMenuClose,
    handleMenuEdit,
    handleMenuOpenMap,
    handleMenuDelete,
    handleDelete,
  }
}
