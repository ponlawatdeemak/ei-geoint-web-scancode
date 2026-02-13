import {
  GetModelSubscriptionWeeklyDtoOut,
  PostSearchFeaturesWeeklyDtoIn,
  // PostSearchWeeklyDtoIn,
  SortType,
  TaskFeature,
} from '@interfaces/index'
import { create } from 'zustand'
import { Dayjs } from 'dayjs'
import weekly from '@/api/weekly'
// import { StacFeatureItem } from '@interfaces/dto/thaicom/stac.dto'
import { getGroupedKeys } from '../../utils/utils'

// New data structures
export interface AreaItem {
  id: number
  name: string
  nameEn: string
  key: string
}

export interface ModelItem {
  id: string // Unique ID: ${name} for collections, or deeper for children
  name: string
  nameEn: string
  modelType: 'collection' | 'model'
  keySources: { key: string; parentAreaId: number }[] // For collections
  keys: string[]
  parentAreaIds: number[]
  children: ModelItem[]
  // This will hold the original ids for selection from the DTO
  selectionIds: { id: number; key: string; parentModelId: number | null }[]
}

/**
 * ฟังก์ชันสำหรับแปลงข้อมูลดิบ (GetModelSubscriptionWeeklyDtoOut)
 * ให้กลายเป็นโครงสร้างข้อมูลที่ใช้งานใน UI (AreaItem และ ModelItem)
 * - AreaItem: คือข้อมูลพื้นที่ (level แรกสุดของข้อมูล)
 * - ModelItem: คือข้อมูลโมเดล ซึ่งอาจจะซ้อนกันหลายชั้น (children)
 *   - โมเดลที่มีชื่อ (name) เหมือนกันแต่อยู่คนละ area จะถูกรวมเป็น 'collection' เดียวกัน
 *   - 'keySources' จะเก็บ key และ id ของ area ที่เป็นเจ้าของ key นั้นๆ เพื่อใช้ในการกรองข้อมูล
 */
export const transformWeeklySubscriptionModel = (
  data: GetModelSubscriptionWeeklyDtoOut[],
): { areas: AreaItem[]; models: ModelItem[] } => {
  const areas: AreaItem[] = data.map((areaDto) => ({
    id: areaDto.id,
    name: areaDto.name,
    nameEn: areaDto.nameEn,
    key: areaDto.key,
  }))

  const modelCollections = new Map<
    string,
    { model: ModelItem; childrenMap: Map<number, GetModelSubscriptionWeeklyDtoOut> }
  >()

  const getAllSelectionIds = (
    m: GetModelSubscriptionWeeklyDtoOut,
  ): { id: number; key: string; parentModelId: number | null }[] => {
    let ids = [{ id: m.id, key: m.key, parentModelId: m.parentModelId }]
    if (m.children) {
      ids = ids.concat(m.children.flatMap(getAllSelectionIds))
    }
    return ids
  }

  data.forEach((areaDto) => {
    if (!areaDto.children) return

    areaDto.children.forEach((modelDto) => {
      if (!modelCollections.has(modelDto.name)) {
        const collectionId = modelDto.name // Use name for unique collection ID
        modelCollections.set(modelDto.name, {
          model: {
            id: collectionId,
            name: modelDto.name,
            nameEn: modelDto.nameEn,
            modelType: 'collection',
            keySources: [], // Changed
            keys: [],
            parentAreaIds: [],
            children: [],
            selectionIds: [],
          },
          childrenMap: new Map(),
        })
      }

      // biome-ignore lint/style/noNonNullAssertion: must have name.
      const collectionEntry = modelCollections.get(modelDto.name)!

      // Changed: Populate keySources to map key to parent area
      collectionEntry.model.keySources.push({ key: modelDto.key, parentAreaId: areaDto.id })
      collectionEntry.model.selectionIds.push(...getAllSelectionIds(modelDto))

      if (modelDto.children) {
        modelDto.children.forEach((child) => {
          if (!collectionEntry.childrenMap.has(child.id)) {
            collectionEntry.childrenMap.set(child.id, child)
          }
        })
      }
    })
  })

  const transformChildren = (
    childrenDto: GetModelSubscriptionWeeklyDtoOut[],
    parentId: string,
    parentAreaIds: number[],
  ): ModelItem[] => {
    const childrenGroupedByName = new Map<string, GetModelSubscriptionWeeklyDtoOut[]>()

    childrenDto.forEach((child) => {
      if (!childrenGroupedByName.has(child.name)) {
        childrenGroupedByName.set(child.name, [])
      }
      // biome-ignore lint/style/noNonNullAssertion: must have name.
      childrenGroupedByName.get(child.name)!.push(child)
    })

    const result: ModelItem[] = []

    childrenGroupedByName.forEach((groupedChildren, name) => {
      const firstChild = groupedChildren[0]
      const childId = `${parentId}-${name}` // Use name for a stable ID

      const allKeys = groupedChildren.map((c) => c.key)
      const allSelectionIds = groupedChildren.flatMap((c) => getAllSelectionIds(c))

      // Recursively transform and merge children from all grouped items
      const allGrandChildren = groupedChildren.flatMap((c) => c.children || [])
      const grandChildren = transformChildren(allGrandChildren, childId, parentAreaIds)

      const modelItem: ModelItem = {
        id: childId,
        name: name,
        nameEn: firstChild.nameEn, // Assuming nameEn is the same for the same name
        modelType: 'model',
        keySources: [], // Child models don't have direct area sources
        keys: allKeys,
        parentAreaIds: parentAreaIds,
        children: grandChildren,
        selectionIds: allSelectionIds,
      }
      result.push(modelItem)
    })

    return result
  }

  modelCollections.forEach((entry) => {
    // Derive flat keys and parentAreaIds from keySources for backward compatibility
    entry.model.keys = entry.model.keySources.map((ks) => ks.key)
    entry.model.parentAreaIds = [...new Set(entry.model.keySources.map((ks) => ks.parentAreaId))]

    const childrenDto = Array.from(entry.childrenMap.values())
    entry.model.children = transformChildren(childrenDto, entry.model.id, entry.model.parentAreaIds)
  })

  const models = Array.from(modelCollections.values()).map((e) => e.model)

  return { areas, models }
}

interface WeeklyMapState {
  data: TaskFeature[]
  selectedData: TaskFeature | null

  allAreas: AreaItem[]
  allModels: ModelItem[]

  selectedAreas: AreaItem[]
  selectedModels: ModelItem[]

  loading: boolean
  page: number
  pageCount: number
  rowsPerPage: number
  total: number
  order: SortType
  startDate: Dayjs | null
  endDate: Dayjs | null
  tokenNext: string | null
  tokenPrevious?: string | null
  isZoom?: boolean | null
  isOpenWeeklyGroupPanel: boolean

  initialize: (data: GetModelSubscriptionWeeklyDtoOut[]) => void
  search: () => Promise<void>
  setSelectedData: (data: TaskFeature | null) => void

  setSelectedAreas: (areas: AreaItem[]) => void
  setSelectedModels: (models: ModelItem[]) => void

  setStartDate: (date: Dayjs | null) => void
  setEndDate: (date: Dayjs | null) => void
  nextPage: (autoSelectFirstRow?: boolean) => Promise<void>
  prevPage: (autoSelectLastRow?: boolean) => Promise<void>
  setOrder: (order: SortType) => Promise<void>
  setIsZoom: (zoom: boolean) => void
  setIsOpenWeeklyGroupPanel: (isOpen: boolean) => void
}

/**
 * ฟังก์ชันสำหรับแปลงโครงสร้าง model ที่ซ้อนกัน (nested) ให้กลายเป็น array ชั้นเดียว (flat)
 */
const flattenModels = (modelItems: ModelItem[]): ModelItem[] => {
  const allModels: ModelItem[] = []
  const queue = [...modelItems]
  while (queue.length > 0) {
    const current = queue.shift()
    if (current) {
      allModels.push(current)
      if (current.children && current.children.length > 0) {
        queue.push(...current.children)
      }
    }
  }
  return allModels
}

export const useWeeklyMapStore = create<WeeklyMapState>((set, get) => {
  /**
   * ฟังก์ชันภายในสำหรับดึงข้อมูลจาก API (postSearch)
   * @param token - token สำหรับการ phân trang (pagination)
   * @param sortOrder - ลำดับการเรียงข้อมูล
   * @param newPage - หมายเลขหน้าใหม่
   * @param autoSelect - กำหนดว่าจะให้เลือกข้อมูลตัวแรก ('first') หรือตัวสุดท้าย ('last') อัตโนมัติหรือไม่
   */
  const _fetchData = async (
    token: string | null,
    sortOrder: SortType,
    newPage: number,
    autoSelect?: 'first' | 'last',
  ) => {
    set({ loading: true, selectedData: null })
    try {
      const { startDate, endDate, selectedAreas, selectedModels, rowsPerPage, setIsZoom } = get()
      const { areaKeys, collectionKeys, modelKeys } = getGroupedKeys(selectedAreas, selectedModels)

      const payload: PostSearchFeaturesWeeklyDtoIn = {
        collectionKeys: [...new Set(collectionKeys)], // Ensure uniqueness
        modelKeys: [...new Set(modelKeys)], // Ensure uniqueness
        areaKeys: [...new Set(areaKeys)], // Ensure uniqueness
        startDate: startDate?.toISOString() || '',
        endDate: endDate?.toISOString() || '',
        limit: rowsPerPage,
        sortField: 'imaging_date',
        sortOrder: sortOrder,
        ...(token && { token: token }),
      }

      setIsZoom(true)
      const results = await weekly.postSearchFeatures(payload)

      const newState: Partial<WeeklyMapState> = {
        data: results.features,
        loading: false,
        tokenNext: results.next,
        tokenPrevious: results.previous,
        page: newPage,
        pageCount: Math.ceil(results.total / rowsPerPage),
        total: results.total,
      }

      if (autoSelect === 'first' && results.features?.length > 0) {
        newState.selectedData = results.features[0]
      } else if (
        autoSelect === 'last' &&
        results.features?.length > 0 &&
        results.returned > 0 &&
        results.returned <= results.features.length
      ) {
        newState.selectedData = results.features[results.returned - 1]
      } else {
        newState.selectedData = results.features[0]
      }

      set(newState)
    } catch (error) {
      console.error('API call failed:', error)
      set({ data: [], loading: false, total: 0, tokenNext: null, tokenPrevious: null, page: 0, pageCount: 0 })
    }
  }

  return {
    data: [],
    selectedData: null,
    allAreas: [],
    allModels: [],
    selectedAreas: [],
    selectedModels: [],
    loading: false,
    page: 0,
    pageCount: 0,
    rowsPerPage: 10,
    total: 0,
    order: SortType.DESC,
    startDate: null,
    endDate: null,
    tokenNext: null,
    tokenPrevious: null,
    isOpenWeeklyGroupPanel: false,

    /**
     * กำหนดค่าเริ่มต้นให้กับ store
     * - แปลงข้อมูลดิบเป็น area และ model
     * - กำหนดให้ area และ model ทั้งหมดถูกเลือกเป็นค่าเริ่มต้น
     */
    initialize: (data) => {
      const { areas, models } = transformWeeklySubscriptionModel(data)
      const allFlattenedModels = flattenModels(models)
      set({ allAreas: areas, allModels: models, selectedAreas: areas, selectedModels: allFlattenedModels })
    },

    search: async () => {
      const { order } = get()
      await _fetchData(null, order, 1)
    },

    nextPage: async (autoSelectFirstRow = false) => {
      const { tokenNext, order, page } = get()
      if (!tokenNext) return
      await _fetchData(tokenNext, order, page + 1, autoSelectFirstRow ? 'first' : undefined)
    },

    prevPage: async (autoSelectLastRow = false) => {
      const { tokenPrevious, order, page } = get()
      if (!tokenPrevious) return
      await _fetchData(tokenPrevious, order, page - 1, autoSelectLastRow ? 'last' : undefined)
    },

    setOrder: async (newOrder) => {
      set({ order: newOrder })
      await _fetchData(null, newOrder, 1)
    },

    setSelectedData: (data) => set({ selectedData: data }),

    /**
     * อัปเดตรายการ area ที่ถูกเลือก และจัดการ model ที่เกี่ยวข้อง
     * - เมื่อ 'เลือก' area ใหม่: model ทั้งหมดที่อยู่ใน area นั้นจะถูกเพิ่มเข้าไปใน `selectedModels`
     * - เมื่อ 'ยกเลิก' area: model ที่เคยถูกเลือกไว้จะถูกกรองออก เพื่อให้แน่ใจว่า `selectedModels`
     *   มีแต่ model ที่อยู่ใน area ที่ยังถูกเลือกอยู่เท่านั้น
     */
    setSelectedAreas: (areas) => {
      const { allModels, selectedModels, selectedAreas: previouslySelectedAreas } = get()
      const newSelectedAreaIds = new Set(areas.map((a) => a.id))
      const previousSelectedAreaIds = new Set(previouslySelectedAreas.map((a) => a.id))

      // ค้นหา area ที่ถูก 'เพิ่ม' เข้ามาใหม่
      const newlyAddedAreaIds = new Set([...newSelectedAreaIds].filter((id) => !previousSelectedAreaIds.has(id)))

      // ดึง model ทั้งหมด (รวมถึง model ลูก) ที่อยู่ใน area ที่ถูกเพิ่มเข้ามาใหม่
      const modelsFromNewAreas = flattenModels(
        allModels.filter((m) => m.parentAreaIds.some((id) => newlyAddedAreaIds.has(id))),
      )

      // รวม model ที่ถูกเลือกอยู่แล้วกับ model จาก area ใหม่
      const combinedSelectedModels = [...selectedModels]
      const currentSelectedModelIds = new Set(combinedSelectedModels.map((m) => m.id))

      modelsFromNewAreas.forEach((model) => {
        if (!currentSelectedModelIds.has(model.id)) {
          combinedSelectedModels.push(model)
        }
      })

      // กรองรายการ model ที่เลือกรวมกันอีกครั้ง เพื่อให้แน่ใจว่า model ทั้งหมด
      // เป็นของ area ที่ยังคงถูกเลือกอยู่ (จัดการกรณี 'ยกเลิก' การเลือก area)
      const allModelsInSelectedAreas = flattenModels(
        allModels.filter((m) => m.parentAreaIds.some((id) => newSelectedAreaIds.has(id))),
      )
      const allAvailableModelIds = new Set(allModelsInSelectedAreas.map((m) => m.id))

      const newSelectedModels = combinedSelectedModels.filter((m) => allAvailableModelIds.has(m.id))

      set({ selectedAreas: areas, selectedModels: newSelectedModels })
    },

    setSelectedModels: (models) => set({ selectedModels: models }),

    setStartDate: (date) => set({ startDate: date }),
    setEndDate: (date) => set({ endDate: date }),

    setIsZoom: (zoom: boolean) => {
      set({ isZoom: zoom })
    },

    setIsOpenWeeklyGroupPanel: (isOpen: boolean) => {
      set({ isOpenWeeklyGroupPanel: isOpen })
    },
  }
})
