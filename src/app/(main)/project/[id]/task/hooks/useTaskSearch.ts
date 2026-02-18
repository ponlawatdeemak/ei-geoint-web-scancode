import { useState, useCallback, useEffect, useRef } from 'react'
import { useSearchParams, usePathname } from 'next/navigation'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import service from '@/api'
import { type SortType, TaskStatus } from '@interfaces/config'
import type { SearchTasksDtoIn, GetTasksDtoOut, PostSearchLayersTasksDtoOut } from '@interfaces/index'
import type { GetProjectDtoOut } from '@interfaces/dto/projects'
import type { GetModelSubscriptionWeeklyDtoOut } from '@interfaces/dto/weekly'
import type { ItvLayer, Task } from '@interfaces/entities'

const parseKeywordParam = (keyword: string): Record<string, string> => {
  const result: Record<string, string> = {}
  if (!keyword) return result

  const colonIndex = keyword.indexOf(':')
  if (colonIndex > -1) {
    const prefix = keyword.slice(0, colonIndex).toLowerCase()
    const value = keyword.slice(colonIndex + 1).trim()

    if (prefix === 'name' || prefix === 'creator') {
      result[prefix] = value
    } else {
      result.name = keyword
    }
  } else {
    result.name = keyword
  }
  return result
}

const buildSearchParams = (
  projectId: string | undefined,
  filters: Record<string, string>,
  keyword: string,
  page?: number,
  rowsPerPage?: number,
  sortState?: { orderBy: string; order: SortType },
): Record<string, unknown> => {
  const params: Record<string, unknown> = {
    projectId: projectId,
    serviceId: filters.serviceId ? Number(filters.serviceId) : undefined,
    rootModelId: filters.rootModelId ? Number(filters.rootModelId) : undefined,
    statusId: filters.statusId ? Number(filters.statusId) : undefined,
  }

  Object.assign(params, parseKeywordParam(keyword))

  if (typeof page === 'number' && typeof rowsPerPage === 'number') {
    params.offset = page * rowsPerPage
    params.limit = rowsPerPage
  }

  if (sortState) {
    params.sortField = sortState.orderBy
    params.sortOrder = sortState.order
  }

  return params
}

interface UseTaskSearchProps {
  projectId: string | undefined
}

export const useTaskSearch = ({ projectId }: UseTaskSearchProps) => {
  const { showAlert, showLoading, hideLoading } = useGlobalUI()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const [searchTrigger, setSearchTrigger] = useState<number>(0)
  const [project, setProject] = useState<GetProjectDtoOut | null>(null)
  const [weeklySubscriptionModel, setWeeklySubscriptionModel] = useState<GetModelSubscriptionWeeklyDtoOut[]>([])
  const [featureLayers, setFeatureLayers] = useState<PostSearchLayersTasksDtoOut>({
    features: [],
    total: 0,
    returned: 0,
  })
  const [itvLayers, setItvLayers] = useState<ItvLayer[]>([])
  const [isLayerLoading, setIsLayerLoading] = useState(true)
  const [taskList, setTaskList] = useState<GetTasksDtoOut[]>([])
  const [isRefresh, setIsRefresh] = useState(false)
  const autoRefreshIntervalRef = useRef<number | null>(null)
  const [loading, setLoading] = useState(false)
  const isStatusCheckedRef = useRef(false)

  const fetchLayer = useCallback(async () => {
    if (!projectId) return
    const taskIds = taskList.map((task) => String(task.id))
    try {
      showLoading()
      const feaLayers = await service.importToVisualize.searchLayers({ projectId, taskIdList: taskIds })
      setFeatureLayers(feaLayers.taskLayer)
      setItvLayers(feaLayers.itvLayer)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : undefined
      showAlert({ status: 'error', errorCode: message })
    } finally {
      hideLoading()
    }
  }, [projectId, taskList, showAlert, hideLoading, showLoading])

  // fetch project details so we can show project name in breadcrumbs
  useEffect(() => {
    if (!projectId) return
    const viewParam = searchParams.get('view')
    let mounted = true
    const load = async () => {
      try {
        if (viewParam === 'map') {
          showLoading()
          setIsLayerLoading(true)

          const tasks = await service.tasks.getAll(projectId)
          setTaskList(tasks)
          const taskIds = tasks.map((task) => String(task.id))
          const feaLayers = await service.importToVisualize.searchLayers({ projectId, taskIdList: taskIds })
          setFeatureLayers(feaLayers.taskLayer)
          setItvLayers(feaLayers.itvLayer)
        }

        const p = await service.projects.get(projectId)
        const res = await service.weekly.getSubscriptionModel()

        if (viewParam !== 'map' && p.tasks.length <= 0) {
          const newSearchParams = new URLSearchParams(searchParams.toString())
          newSearchParams.set('view', 'map')
          globalThis.history.replaceState(null, '', `${pathname}?${newSearchParams.toString()}`)
        }
        setWeeklySubscriptionModel(res)
        setIsLayerLoading(false)

        if (mounted) setProject(p)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : undefined
        showAlert({
          status: 'error',
          errorCode: message,
        })
      } finally {
        hideLoading()
        setIsLayerLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [projectId, searchParams, showAlert, showLoading, hideLoading, pathname])

  // run checkStatusProject once when entering the page; block searches until finished
  useEffect(() => {
    if (!projectId) return
    let mounted = true
    const check = async () => {
      try {
        setLoading(true)
        await service.tasks.checkStatusProject(projectId)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : undefined
        showAlert({ status: 'error', errorCode: message })
      } finally {
        if (mounted) isStatusCheckedRef.current = true
        setLoading(false)
      }
    }
    check()
    return () => {
      mounted = false
    }
  }, [projectId, showAlert])

  // biome-ignore lint/correctness/useExhaustiveDependencies: force re-search
  const onSearch = useCallback(
    async (
      filters: Record<string, string>,
      page?: number,
      rowsPerPage?: number,
      sortState?: { orderBy: string; order: SortType },
    ): Promise<{ rows: Task[]; totalRows: number }> => {
      const keyword = 'keyword'
      const kw = String(filters[keyword] || '').trim()
      setIsRefresh(false)

      const params = buildSearchParams(projectId, filters, kw, page, rowsPerPage, sortState)

      const { data, total } = await service.tasks.search(params as unknown as SearchTasksDtoIn)

      // Fetch thumbnails separately and merge into data
      const taskIds = data.map((row: Task) => row.id)
      const thumbnailMap = new Map<string, string | null>()
      if (taskIds.length > 0) {
        try {
          const thumbnailsRes = await service.tasks.getThumbnails(taskIds)
          for (const item of thumbnailsRes.data) {
            thumbnailMap.set(item.id, item.thumbnail)
          }
        } catch (err) {
          console.log('Failed to fetch thumbnails:', err)
        }
      }

      const dataWithThumbnails = data.map((row: Task) => ({
        ...row,
        thumbnail: thumbnailMap.get(row.id) || null,
      }))

      // Check if any task has inProgress status
      const hasInProgress = dataWithThumbnails.some((row: Task) => row.status?.id === TaskStatus.inProgress)
      console.log('hasInProgress task', hasInProgress)
      setIsRefresh(hasInProgress)

      return { rows: dataWithThumbnails, totalRows: total }
    },
    [searchTrigger, projectId],
  )

  // Auto-refresh every 10 minutes if there are inProgress projects
  useEffect(() => {
    if (isRefresh) {
      if (autoRefreshIntervalRef.current == null) {
        console.log('set interval')
        autoRefreshIntervalRef.current = globalThis.setInterval(
          () => {
            setSearchTrigger((prev) => prev + 1)
          },
          10 * 60 * 1000,
        ) as unknown as number
      }
      return () => {
        if (autoRefreshIntervalRef.current != null) {
          console.log('clear interval')
          clearInterval(autoRefreshIntervalRef.current)
          autoRefreshIntervalRef.current = null
        }
      }
    }

    if (!isRefresh && autoRefreshIntervalRef.current != null) {
      clearInterval(autoRefreshIntervalRef.current)
      autoRefreshIntervalRef.current = null
    }
    return undefined
  }, [isRefresh])

  return {
    project,
    weeklySubscriptionModel,
    featureLayers,
    itvLayers,
    isLayerLoading,
    taskList,
    loading,
    setLoading,
    searchTrigger,
    setSearchTrigger,
    onSearch,
    fetchLayer,
  }
}
