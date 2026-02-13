import { IsNumber, IsOptional, IsString } from 'class-validator'
import { SortType } from '../config'
import { AxiosRequestConfig, AxiosResponse } from 'axios'
import { Type } from 'class-transformer'

export enum APIService {
  WebAPI = 0,
  MapAPI = 1,
  ThaicomAPI = 2,
}

export interface APIConfigType {
  baseURL: string
  apiKey: string
}

export interface AppAPI {
  get: (
    url: string,
    service?: APIService,
    config?: AxiosRequestConfig<any> | undefined,
  ) => Promise<AxiosResponse<any, any>>
  post: (
    url: string,
    data: any,
    service?: APIService,
    config?: AxiosRequestConfig<any> | undefined,
  ) => Promise<AxiosResponse<any, any>>
  put: (
    url: string,
    data: any,
    service?: APIService,
    config?: AxiosRequestConfig<any> | undefined,
  ) => Promise<AxiosResponse<any, any>>
  delete: (
    url: string,
    service?: APIService,
    config?: AxiosRequestConfig<any> | undefined,
  ) => Promise<AxiosResponse<any, any>>
  patch: (
    url: string,
    data: any,
    service?: APIService,
    config?: AxiosRequestConfig<any> | undefined,
  ) => Promise<AxiosResponse<any, any>>
}

export interface RetryQueueItem {
  resolve: (value?: any) => void
  reject: (error?: any) => void
  config: AxiosRequestConfig
}

export type ErrorResponse = {
  // type?: string
  title: string
  message: string
  status: number
  details: any
}

export type ResponseDto<T = any> = {
  data?: T
  message?: string
  tokens?: Tokens
  errorStatus?: number
  error?: ErrorResponse
  total?: number
}

export interface Tokens {
  idToken: string
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface TablePagination {
  sortField: string
  sortOrder: SortType
  limit: number
  offset: number
}

export class SearchDtoIn {
  @IsString()
  @IsOptional()
  sortField?: string

  @IsString()
  @IsOptional()
  sortOrder?: SortType

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  offset?: number
}
