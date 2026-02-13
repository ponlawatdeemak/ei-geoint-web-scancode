'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useProfileStore } from '@/hook/useProfileStore'
import service from '@/api'
import { SearchUsedStorageDataManagementDtoOut } from '@/api/data-management'
import { Roles, SortType } from '@interfaces/index'

interface UseStorageDataProps {
  organizationId?: string
}

export const useStorageData = ({ organizationId }: UseStorageDataProps) => {
  const profile = useProfileStore((state) => state.profile)

  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [sortState, setSortState] = useState<{ orderBy: string; order: SortType }>({
    orderBy: 'total',
    order: SortType.DESC,
  })
  const [currentToken, setCurrentToken] = useState<string | null>(null)

  const isAdminOrSuperAdmin = useMemo(() => {
    return profile && [Roles.superAdmin, Roles.admin].includes(profile.roleId)
  }, [profile])

  const {
    data: storageData,
    isLoading,
    isFetching,
  } = useQuery<SearchUsedStorageDataManagementDtoOut>({
    queryKey: ['data-management-used-storage', organizationId, rowsPerPage, sortState, currentToken],
    queryFn: () =>
      service.dataManagement.getUsedStorage({
        orgId: isAdminOrSuperAdmin && organizationId ? organizationId : null,
        token: currentToken,
        limit: rowsPerPage,
        sortField: sortState.orderBy,
        sortOrder: sortState.order,
      }),
    enabled: !!profile,
  })

  const nextToken = storageData?.nextToken ?? null
  const prevToken = storageData?.prevToken ?? null

  const handlePageChange = (newPage: number) => {
    if (newPage > page && nextToken) {
      // Next page
      setCurrentToken(nextToken)
      setPage(newPage)
    } else if (newPage < page) {
      // Previous page - use prevToken from API (null means first page)
      setCurrentToken(prevToken ?? null)
      setPage(newPage)
    }
  }

  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage)
    setPage(0)
    setCurrentToken(null)
  }

  const handleSortChange = (orderBy: string, order: SortType) => {
    setSortState({ orderBy, order })
    setPage(0)
    setCurrentToken(null)
  }

  return {
    usedStorage: storageData?.usedStorage,
    projectData: storageData?.data ?? [],
    total: storageData?.total ?? 0,
    page,
    rowsPerPage,
    sortState,
    isLoading: isLoading || isFetching,
    hasNextPage: !!storageData?.nextToken,
    hasPrevPage: page > 0,
    onPageChange: handlePageChange,
    onRowsPerPageChange: handleRowsPerPageChange,
    onSortChange: handleSortChange,
  }
}
