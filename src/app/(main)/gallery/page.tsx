'use client'

import { ImageStatus, Roles, ServiceConfig } from '@interfaces/config'
import { Box, Button, Menu, MenuItem } from '@mui/material'
import { useEffect, useId, useMemo, useState } from 'react'
import GalleryUploader from './component/GalleryUploader'
import ImagesSelector from '@/components/common/images'
import { ImagesMode } from '@/components/common/images/images'
import { useTranslation } from 'react-i18next'
import { Add } from '@mui/icons-material'
import useResponsive from '@/hook/responsive'
import { useSearchParams, useRouter } from 'next/navigation'
import service from '@/api'
import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { GetOrganizationDtoOut } from '@interfaces/index'
import { useSettings } from '@/hook/useSettings'
import { useImages } from '@/components/common/images/use-images'
import ResultSwitch from '@/components/common/images/ResultSwitch'
import classNames from 'classnames'
import { useProfileStore } from '@/hook/useProfileStore'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'

const GalleryPage = () => {
  const { t } = useTranslation('common')
  const { isLg } = useResponsive()
  const { language } = useSettings()
  const searchParams = useSearchParams()
  const { imageProcessData, setAction, viewType, setViewType } = useImages()
  const profile = useProfileStore((state) => state.profile)
  const router = useRouter()

  useEffect(() => {
    return () => {
      setAction(null)
    }
  }, [setAction])

  const orgId = useMemo(() => {
    const orgId = searchParams.get('orgId')
    return typeof orgId === 'string' ? orgId : null
  }, [searchParams])

  const [openDialog, setOpenDialog] = useState<ServiceConfig | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const { data: orgData }: UseQueryResult<GetOrganizationDtoOut | undefined, Error> = useQuery({
    queryKey: ['get-org', orgId],
    queryFn: () => service.organizations.get(orgId || ''),
    enabled: !!orgId,
  })

  const orgName = useMemo(() => {
    if (!orgData) return '-'
    return language === 'th' ? orgData.name : orgData.nameEn
  }, [orgData, language])

  const open = Boolean(anchorEl)
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }
  const handleCloseMenu = () => {
    setAnchorEl(null)
  }

  useEffect(() => {
    if (!imageProcessData) {
      setAnchorEl(null)
    }
  }, [imageProcessData])

  const handleOpenDialog = (service: ServiceConfig) => {
    setOpenDialog(service)
    setAnchorEl(null)
  }
  const handleCloseDialog = () => setOpenDialog(null)
  const buttonId = useId()
  const menuId = useId()

  const canUpload = useMemo(() => {
    if (!profile) return false
    return (
      profile.roleId === Roles.superAdmin ||
      profile.roleId === Roles.admin ||
      profile.roleId === Roles.customerAdmin ||
      profile.roleId === Roles.user
    )
  }, [profile])

  return (
    <Box className='relative flex h-full w-full flex-col'>
      <div
        className={classNames('flex justify-between bg-white px-4 py-2', {
          'lg:h-14': !orgId,
          'lg:h-20': !!orgId,
        })}
      >
        <div className='flex flex-row gap-2'>
          {searchParams.size > 0 && (
            <div className='flex shrink-0 items-center'>
              <Button className='min-w-0! px-2!' onClick={() => router.back()}>
                <ArrowBackIosNewIcon />
              </Button>
            </div>
          )}
          <div className='flex flex-col gap-2'>
            <div className='flex items-center gap-4 lg:h-10'>
              <div className='text-base lg:h-10 lg:text-2xl'>{t('menu.gallery')}</div>
              {canUpload && (
                <div>
                  <Button
                    id={buttonId}
                    aria-controls={open ? 'image-upload-menu' : undefined}
                    aria-haspopup='true'
                    aria-expanded={open ? 'true' : undefined}
                    onClick={handleClick}
                    variant='contained'
                    color='primary'
                    startIcon={isLg ? <Add /> : undefined}
                    className='min-w-0! px-2! lg:h-10 lg:px-4!'
                    disabled={!!imageProcessData && imageProcessData.status?.id !== ImageStatus.uploadPending}
                  >
                    {isLg ? t('gallery.title.upload') : <Add />}
                  </Button>
                  <Menu
                    id={menuId}
                    anchorEl={anchorEl}
                    open={open}
                    onClose={handleCloseMenu}
                    slotProps={{ list: { 'aria-labelledby': 'image-upload-menu-button' } }}
                  >
                    <MenuItem onClick={() => handleOpenDialog(ServiceConfig.optical)}>
                      {t('gallery.title.optical')}
                    </MenuItem>
                    <MenuItem onClick={() => handleOpenDialog(ServiceConfig.sar)}>{t('gallery.title.sar')}</MenuItem>
                  </Menu>
                </div>
              )}
            </div>
            {orgId && (
              <div className='flex gap-4 text-[#4F524F] text-sm'>
                <div>{t('gallery.title.organization')}:</div>
                <div>{orgName}</div>
              </div>
            )}
          </div>
        </div>
        <div className='lg:hidden'>{<ResultSwitch value={viewType} onChange={setViewType} />}</div>
      </div>
      {
        <GalleryUploader
          serviceId={openDialog}
          open={openDialog !== null}
          onClose={handleCloseDialog}
          searchParamsOrgId={orgId || null}
          // onComplete={onUploadComplete}
        />
      }
      <div
        className={classNames('flex-1 overflow-auto lg:overflow-hidden', {
          'lg:h-[calc(100%-80px)]': !!orgId,
          'lg:h-[calc(100%-53px)]': !orgId,
        })}
      >
        <ImagesSelector mode={ImagesMode.Editor} pageUse='gallery' />
      </div>
    </Box>
  )
}

export default GalleryPage
