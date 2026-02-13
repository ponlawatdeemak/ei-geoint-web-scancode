import { create } from 'zustand'
import { ImageAction, ImagesMode, ImageSortBy, ImageUploadStep, ViewType, WssImageData } from './images'
import {
  GetByItemIdImageDtoOut,
  GetInProgressDtoOut,
  SearchImagesDtoOut,
  SearchImagesResultItem,
} from '@interfaces/dto/images'
import { useShallow } from 'zustand/shallow'
import { QueryObserverResult, RefetchOptions } from '@tanstack/react-query'
import { SortType } from '@interfaces/config'

type ReFetchSearch = (options?: RefetchOptions) => Promise<QueryObserverResult<SearchImagesDtoOut | undefined, Error>>
type ReFetchInProgress = (
  options?: RefetchOptions,
) => Promise<QueryObserverResult<GetInProgressDtoOut | undefined, Error>>

export type ImageActionData = {
  imageId: string | null
  fileName: string | null
  itemId: string | null
  imagingDate: Date | null | undefined
  hashtags: string | null | undefined
  originalFileUrl: string | null
  serviceId: number | null
  isProcessed: boolean | null
  organizationId: string | null
}

interface ImagesState {
  imagesMode: ImagesMode // Select only or CRUD actions
  setImageMode: (mode: ImagesMode) => void
  viewType: ViewType // Card || Table display
  setViewType: (type: ViewType) => void
  selectSearchItem: SearchImagesResultItem | null // Selected item from search results (data from geoint api)
  setSelectSearchItem: (item: SearchImagesResultItem | null) => void
  selectedImage: GetByItemIdImageDtoOut | null // Selected image from App DB
  setSelectedImage: (image: GetByItemIdImageDtoOut | null) => void
  showImageDialog: boolean // Image dialog visibility on mobile
  setShowImageDialog: (show: boolean) => void
  imageSort: { orderBy: ImageSortBy; order: SortType } // Image search results sorting criteria
  setImageSort: (sort: { orderBy: ImageSortBy; order: SortType }) => void
  action: {
    action: ImageAction
    image: ImageActionData
  } | null // current action from context menu or action button (detail panel under map)
  setAction: (
    value: {
      action: ImageAction
      image: ImageActionData
    } | null,
  ) => void
  imageProcessData: GetInProgressDtoOut | null | undefined // ข้อมูล image ที่กำลังประมวลผล
  setImageProcessData: (value: GetInProgressDtoOut | null | undefined) => void

  uploadStep: ImageUploadStep | null | undefined // Current step in image upload process
  setUploadStep: (step: ImageUploadStep | null | undefined) => void
  uploadProgress: number // Upload progress percentage
  setUploadProgress: (progress: number) => void
  searchImage: ReFetchSearch | null
  setSearchImage: (fn: ReFetchSearch | null) => void
  searchInProgressImage: ReFetchInProgress | null
  setSearchInProgressImage: (fn: ReFetchInProgress | null) => void
  cancelUpload: (() => void) | null
  setCancelUpload: (fn: (() => void) | null) => void
  wssImageData: WssImageData | null
  setWssImageData: (value: WssImageData | null) => void

  // Pagination state
  currentPage: number // Current page number (1-indexed)
  setCurrentPage: (page: number) => void
  pageSize: number
  setPageSize: (size: number) => void
  resetPagination: () => void // Reset pagination state
}

export const useImagesStore = create<ImagesState>((set) => ({
  imagesMode: ImagesMode.Editor,
  setImageMode: (imagesMode: ImagesMode) => set({ imagesMode }),
  viewType: ViewType.GRID,
  setViewType: (viewType: ViewType) => set({ viewType }),
  selectSearchItem: null,
  setSelectSearchItem: (itemId: SearchImagesResultItem | null) => set({ selectSearchItem: itemId }),
  selectedImage: null,
  setSelectedImage: (image: GetByItemIdImageDtoOut | null) => set({ selectedImage: image }),
  showImageDialog: false,
  setShowImageDialog: (show: boolean) => set({ showImageDialog: show }),
  imageSort: { orderBy: ImageSortBy.Name, order: SortType.ASC },
  setImageSort: (sort: { orderBy: ImageSortBy; order: SortType }) => set({ imageSort: sort }),
  action: null,
  setAction: (action: { action: ImageAction; image: any } | null) => set({ action }),
  imageProcessData: undefined,
  setImageProcessData: (value: GetInProgressDtoOut | null | undefined) => set({ imageProcessData: value }),
  uploadStep: null,
  setUploadStep: (step: ImageUploadStep | null | undefined) => set({ uploadStep: step }),
  uploadProgress: 0,
  setUploadProgress: (progress: number) => set({ uploadProgress: progress }),
  searchImage: null,
  setSearchImage: (fn: ReFetchSearch | null) => set({ searchImage: fn }),
  searchInProgressImage: null,
  setSearchInProgressImage: (fn: ReFetchInProgress | null) => set({ searchInProgressImage: fn }),
  cancelUpload: null,
  setCancelUpload: (fn: (() => void) | null) => set({ cancelUpload: fn }),
  wssImageData: null,
  setWssImageData: (value: WssImageData | null) => set({ wssImageData: value }),

  // Pagination state
  currentPage: 1,
  setCurrentPage: (currentPage: number) => set({ currentPage }),
  pageSize: 10,
  setPageSize: (pageSize: number) => set({ pageSize, currentPage: 1 }),
  resetPagination: () => set({ currentPage: 1 }),
}))

export function useImages() {
  return useImagesStore(
    useShallow((s) => ({
      imagesMode: s.imagesMode,
      setImageMode: s.setImageMode,
      viewType: s.viewType,
      setViewType: s.setViewType,
      selectSearchItem: s.selectSearchItem,
      setSelectSearchItem: s.setSelectSearchItem,
      selectedImage: s.selectedImage,
      setSelectedImage: s.setSelectedImage,
      showImageDialog: s.showImageDialog,
      setShowImageDialog: s.setShowImageDialog,
      imageSort: s.imageSort,
      setImageSort: s.setImageSort,
      action: s.action,
      setAction: s.setAction,
      imageProcessData: s.imageProcessData,
      setImageProcessData: s.setImageProcessData,
      uploadStep: s.uploadStep,
      setUploadStep: s.setUploadStep,
      uploadProgress: s.uploadProgress,
      setUploadProgress: s.setUploadProgress,
      searchImage: s.searchImage,
      setSearchImage: s.setSearchImage,
      searchInProgressImage: s.searchInProgressImage,
      setSearchInProgressImage: s.setSearchInProgressImage,
      cancelUpload: s.cancelUpload,
      setCancelUpload: s.setCancelUpload,
      wssImageData: s.wssImageData,
      setWssImageData: s.setWssImageData,
      // Pagination
      currentPage: s.currentPage,
      setCurrentPage: s.setCurrentPage,
      pageSize: s.pageSize,
      setPageSize: s.setPageSize,
      resetPagination: s.resetPagination,
    })),
  )
}
