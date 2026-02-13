import { PostSearchFeaturesWeeklyDtoIn, SortType, TaskFeature } from '@interfaces/index'
import { create } from 'zustand'
import weekly from '@/api/weekly'

interface WeeklyMapCompareState {
  data: TaskFeature[]
  loading: boolean
  page: number
  pageCount: number
  rowsPerPage: number
  total: number
  order: SortType
  tokenNext: string | null
  tokenPrevious?: string | null
  searchParams: PostSearchFeaturesWeeklyDtoIn | null

  search: (params: PostSearchFeaturesWeeklyDtoIn) => Promise<void>
  nextPage: () => Promise<void>
  prevPage: () => Promise<void>
  setOrder: (order: SortType) => Promise<void>
}

export const useWeeklyMapCompareStore = create<WeeklyMapCompareState>((set, get) => {
  /**
   * Helper function ภายในสำหรับเรียก API และอัปเดต state
   * @param payload - ข้อมูลที่จะส่งไปกับ API request
   * @param newPage - (Optional) หมายเลขหน้าใหม่ที่จะตั้งค่า
   */
  const _fetchData = async (payload: PostSearchFeaturesWeeklyDtoIn, newPage?: number) => {
    set({ loading: true })
    try {
      const results = await weekly.postSearchFeatures(payload)
      const { rowsPerPage } = get()
      set({
        data: results.features,
        tokenNext: results.next,
        tokenPrevious: results.previous,
        total: results.total,
        pageCount: Math.ceil(results.total / rowsPerPage),
        // อัปเดตหน้าถ้ามีการส่งค่า newPage มา
        ...(newPage !== undefined && { page: newPage }),
        loading: false,
      })
    } catch (error) {
      console.error('API call failed:', error)
      // จัดการ error ให้เหมือนกันทุกที่
      set({ data: [], loading: false, total: 0, tokenNext: null, tokenPrevious: null, page: 0, pageCount: 0 })
    }
  }

  return {
    data: [],
    loading: false,
    page: 0,
    pageCount: 0,
    rowsPerPage: 10,
    total: 0,
    order: SortType.DESC,
    tokenNext: null,
    tokenPrevious: null,
    searchParams: null,

    search: async (params) => {
      set({ searchParams: params, order: params.sortOrder || SortType.DESC })
      const payload: PostSearchFeaturesWeeklyDtoIn = {
        ...params,
        limit: get().rowsPerPage,
        sortOrder: get().order,
      }
      await _fetchData(payload, 1) // เรียกใช้ helper และตั้งค่าหน้าเป็น 1
    },

    nextPage: async () => {
      const { searchParams, tokenNext } = get()
      if (!tokenNext || !searchParams) return

      const payload: PostSearchFeaturesWeeklyDtoIn = {
        ...searchParams,
        limit: get().rowsPerPage,
        sortOrder: get().order,
        token: tokenNext,
      }
      await _fetchData(payload, get().page + 1) // เรียกใช้ helper และบวกหน้า
    },

    prevPage: async () => {
      const { searchParams, tokenPrevious } = get()
      if (!tokenPrevious || !searchParams) return

      const payload: PostSearchFeaturesWeeklyDtoIn = {
        ...searchParams,
        limit: get().rowsPerPage,
        sortOrder: get().order,
        token: tokenPrevious,
      }
      await _fetchData(payload, get().page - 1) // เรียกใช้ helper และลบหน้า
    },

    setOrder: async (order) => {
      const { searchParams } = get()
      if (!searchParams) return

      set({ order })
      const payload: PostSearchFeaturesWeeklyDtoIn = {
        ...searchParams,
        limit: get().rowsPerPage,
        sortOrder: order,
      }
      await _fetchData(payload, 1) // เรียกใช้ helper และตั้งค่าหน้าเป็น 1
    },
  }
})
