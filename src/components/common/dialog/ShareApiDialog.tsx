import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { useTranslation } from 'react-i18next'
import { MapType, ProjectMapViewGroup } from '@interfaces/config'
import { GetModelAllDtoOut, TaskFeature } from '@interfaces/index'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ShareApiDtoIn } from '@interfaces/dto/organization-api-key'
import { useProfileStore } from '@/hook/useProfileStore'
import { findModelByKeyOrName } from '@/components/shared/ProjectMapView/utils/model'
import service from '@/api'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { AxiosError } from 'axios'
import useResponsive from '@/hook/responsive'

const consumeOpticalSarData = (
  data: ProjectMapViewGroup,
  orgId: string,
  modelAll: GetModelAllDtoOut[],
  title: string,
  language: string,
): ShareApiDtoIn => {
  const apiItem = data.layerConfigs
    ? [...data.layerConfigs]
        .reverse()
        .map((layerConfig) => {
          if (layerConfig.type === MapType.tile) {
            return {
              id: layerConfig.id,
              title: layerConfig.label ?? '',
              type: layerConfig.type,
              url: layerConfig.template ?? '',
            }
          } else if (layerConfig.type === MapType.vector) {
            const model = findModelByKeyOrName(modelAll, layerConfig.assetKey ?? '')
            const title = language === 'th' ? model?.name || model?.nameEn || '' : (model?.nameEn ?? '')
            return {
              id: layerConfig.id,
              title: title,
              type: layerConfig.type,
              url: layerConfig.data ? (layerConfig.data as string) : '',
            }
          } else if (layerConfig.type === MapType.geojson) {
            return {
              id: layerConfig.id,
              title,
              type: layerConfig.type,
              // ตรงนี้ใน issues ให้เป็น null แต่ใน type จริงๆมีแค่ string
              url: '',
            }
          }
          return undefined
        })
        .filter((item) => item !== undefined)
    : []

  return {
    orgId,
    data: apiItem,
  }
}

const consumeWeeklyRowData = (data: TaskFeature, orgId: string): ShareApiDtoIn => {
  const mapLayers =
    data.layer?.[0].mapLayers
      ?.map((item) => {
        if ((item.id as string).endsWith('centroid_tile')) {
          return undefined
        }
        return {
          id: (item.id as string) ?? '',
          title: item.title ?? '',
          type: MapType.vector,
          url: item.href ?? '',
        }
      })
      .filter((item) => item !== undefined) ?? []

  const tileLayers =
    data.layer?.[0].tileLayers?.map((item) => {
      return {
        id: (item.id as string) ?? '',
        title: item.title ?? '',
        type: MapType.tile,
        url: item.href ?? '',
      }
    }) ?? []

  return {
    orgId,
    data: [...mapLayers, ...tileLayers],
  }
}

const ShareApiDialog = ({
  open,
  onClose,
  data,
  shareType,
}: {
  open: boolean
  onClose: () => void
  data?: ProjectMapViewGroup | TaskFeature | null
  shareType: 'optical-sar' | 'weekly'
}) => {
  const { showAlert } = useGlobalUI()
  const { is2K } = useResponsive()

  const profile = useProfileStore((state) => state.profile)
  const { t, i18n } = useTranslation('common')

  const { data: cachedModel } = useQuery({
    queryKey: ['model-all'],
    queryFn: async () => {
      const models = await service.lookup.getModelAll()
      return models
    },
  })

  const [payload, setPayload] = useState<ShareApiDtoIn | null>(null)

  useEffect(() => {
    if (data && profile) {
      let payload: ShareApiDtoIn | null = null
      if (shareType === 'optical-sar' && 'layerConfigs' in data && cachedModel) {
        payload = consumeOpticalSarData(data, profile?.organization.id, cachedModel, t('map.aoiLayer'), i18n.language)
      } else if (shareType === 'weekly' && 'layer' in data) {
        payload = consumeWeeklyRowData(data, profile?.organization.id)
      }
      if (payload) {
        setPayload(payload)
      }
    }
  }, [data, shareType, profile, cachedModel, t, i18n])

  const {
    data: shareApis,
    isLoading: isShareApiLoading,
    error,
  } = useQuery({
    queryKey: ['post-share-api', payload],
    queryFn: async () => {
      if (payload) {
        return await service.apiKey.shareApiUrls(payload)
      }
    },
    enabled: !!payload,
  })
  useEffect(() => {
    if (error) {
      onClose()
      showAlert({
        status: 'error',
        errorCode: error instanceof AxiosError ? error.code : error.message,
      })
    }
  }, [error, onClose, showAlert])

  const dialogContent = useMemo(() => {
    if (!shareApis || isShareApiLoading) {
      return (
        <Box className='flex h-full w-full items-center justify-center'>
          <CircularProgress size={48} color='primary' />
        </Box>
      )
    }
    const urlData = shareApis.data
    if (urlData.length === 0) {
      return (
        <Box className='flex h-full w-full items-center justify-center'>
          <Typography className='text-lg'>{t('alert.dataNotFound')}</Typography>
        </Box>
      )
    }
    return (
      <Box className='flex flex-col gap-2'>
        {urlData.map((data) => {
          return (
            <Box key={data.id} className='flex flex-col' onClick={(e) => e.stopPropagation()}>
              <Typography
                component='label'
                noWrap
                // fontSize={12}
                onClick={(e) => e.stopPropagation()}
                className='pr-13!'
              >
                {data.title}
              </Typography>
              <Box className='flex w-full flex-row items-center gap-4' onClick={(e) => e.stopPropagation()}>
                <TextField
                  variant='outlined'
                  aria-readonly
                  value={data.url}
                  sx={{
                    '& .MuiInputBase-root': {
                      borderRadius: '8px',
                      boxShadow: '0px 1px 2px 0px #15151514',
                    },
                    '& input': {
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                    },
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                  fullWidth
                />
                <IconButton
                  onClick={async (e) => {
                    e.stopPropagation()
                    if (data.url) {
                      await navigator.clipboard.writeText(data.url)
                    }
                  }}
                  color='primary'
                  size='small'
                >
                  <ContentCopyIcon />
                </IconButton>
              </Box>
            </Box>
          )
        })}
      </Box>
    )
  }, [shareApis, isShareApiLoading, t])

  return (
    <Dialog open={open} fullWidth maxWidth={is2K ? 'lg' : 'sm'}>
      <DialogTitle noWrap onClick={(e) => e.stopPropagation()}>
        {t('dialog.shareApi.title')}
      </DialogTitle>
      <DialogContent className='px-8! py-2! max-sm:px-6!'>{dialogContent}</DialogContent>
      <DialogActions>
        <Button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
        >
          {t('button.close')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ShareApiDialog
