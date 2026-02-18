import service from '@/api'
import { handlePrefixQuery, parseDateToISO } from '@/app/(main)/project/page'
import { TaskStatus } from '@interfaces/config'
import type { SortType } from '@interfaces/config'
import type { GetLookupDtoOut, SearchProjectResultItem } from '@interfaces/index'
import { useCallback, useState } from 'react'

interface UseProjectSearchProps {
  cacheTaskStatuses: GetLookupDtoOut[]
}

interface ProjectWithThumbnail extends SearchProjectResultItem {
  thumbnail?: string | null
}

export const useProjectSearch = ({ cacheTaskStatuses }: UseProjectSearchProps) => {
  const [searchTrigger, setSearchTrigger] = useState<number>(0)
  const [isRefresh, setIsRefresh] = useState(false)
  const [selectedProject, setSelectedProject] = useState<SearchProjectResultItem | null>(null)
  const [popupCoordinates, setPopupCoordinates] = useState<[number, number] | null>(null)

  const onSearch = useCallback(
    async (
      filters: Record<string, string>,
      page?: number,
      rowsPerPage?: number,
      sortState?: { orderBy: string; order: SortType },
    ): Promise<{ rows: ProjectWithThumbnail[]; totalRows: number }> => {
      // Close popup when searching
      setSelectedProject(null)
      setPopupCoordinates(null)
      setIsRefresh(false)

      const fromISO = parseDateToISO(filters.createdAtFrom, false)
      const toISO = parseDateToISO(filters.createdAtTo, true)
      const kw = String(filters.keyword || '').trim()

      const params: Record<string, unknown> = {
        organizationId: filters.organizationId,
        subscriptionId: filters.subscriptionId,
        from: fromISO,
        to: toISO,
      }

      // support prefix queries: name:, desc:, creator:, status:
      // if no prefix present, fall back to keyword search
      if (kw) {
        const colonIndex = kw.indexOf(':')
        if (colonIndex > -1) {
          const prefix = kw.slice(0, colonIndex).toLowerCase()
          const value = kw.slice(colonIndex + 1).trim()

          if (['name', 'desc', 'creator', 'status'].includes(prefix)) {
            handlePrefixQuery(prefix, value, params, cacheTaskStatuses)
          } else {
            params.name = kw
          }
        }
      }

      if (typeof page === 'number' && typeof rowsPerPage === 'number') {
        params.offset = page * rowsPerPage
        params.limit = rowsPerPage
      }
      if (sortState) {
        params.sortField = sortState.orderBy
        params.sortOrder = sortState.order
      }

      const { data, total } = await service.projects.search(params)

      // Fetch thumbnails separately and merge into data
      const projectIds = data.map((row: SearchProjectResultItem) => row.id)
      const thumbnailMap = new Map<string, string | null>()
      if (projectIds.length > 0) {
        try {
          const thumbnailsRes = await service.projects.getThumbnails(projectIds)
          for (const item of thumbnailsRes.data) {
            thumbnailMap.set(item.id, item.thumbnail)
          }
        } catch (err) {
          console.log('Failed to fetch thumbnails:', err)
        }
      }

      const dataWithThumbnails = data.map((row: SearchProjectResultItem) => ({
        ...row,
        thumbnail: thumbnailMap.get(row.id) || null,
      }))

      const hasInProgress = dataWithThumbnails.some(
        (row: SearchProjectResultItem) => row.status?.id === TaskStatus.inProgress,
      )
      setIsRefresh(hasInProgress)

      return {
        rows: dataWithThumbnails,
        totalRows: total,
      }
    },
    [cacheTaskStatuses],
  )

  return {
    searchTrigger,
    setSearchTrigger,
    isRefresh,
    setIsRefresh,
    selectedProject,
    setSelectedProject,
    popupCoordinates,
    setPopupCoordinates,
    onSearch,
  }
}
