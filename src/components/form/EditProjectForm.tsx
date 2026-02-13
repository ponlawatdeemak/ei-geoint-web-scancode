'use client'

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/hook/useSettings'
import { useForm, Controller, type Resolver, UseFormTrigger, UseFormGetValues } from 'react-hook-form'
import Autocomplete from '@mui/material/Autocomplete'
import { yupResolver } from '@hookform/resolvers/yup'
import * as Yup from 'yup'
import { TextField, Button, Chip, Menu, MenuItem, CircularProgress } from '@mui/material'
import InputLabel from '@/components/common/input/InputLabel'
import FormWrapper from '@/components/layout/FormWrapper'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import SaveIcon from '@mui/icons-material/Save'
import InboxIcon from '@mui/icons-material/Inbox'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import PickerDialog from '@/components/dialog/PickerDialog'
import { FilterFieldConfig } from '@/components/layout/SearchWrapper'
import MuiTableHOC, { MuiTableColumn } from '@/components/common/display/MuiTableHOC'
import service from '@/api'
import { PostProjectDtoIn, PutProjectDtoIn, GetProjectDtoOut, SortType, Roles } from '@interfaces/index'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { useProfileStore } from '@/hook/useProfileStore'

type Props = {
  projectId?: string
  isOpenFromGallery?: boolean
  setForm?: (form: { trigger: UseFormTrigger<any>; getValues: UseFormGetValues<any> }) => void
  externalOrgId?: string
  setExternalUserIds?: (userIds: string[]) => void
  setIsValid?: (isValid: boolean) => void
}

type FormValues = {
  name: string
  detail?: string
  organizationId: string
}

const EditProjectForm: React.FC<Props> = ({
  projectId,
  isOpenFromGallery = false,
  setForm,
  externalOrgId,
  setExternalUserIds,
  setIsValid,
}) => {
  const router = useRouter()
  const { t } = useTranslation('common')
  const { language } = useSettings()
  const { showLoading, hideLoading, showAlert } = useGlobalUI()
  const profile = useProfileStore((state) => state.profile)!
  const [loading, setLoading] = useState(false)
  const [createdBy, setCreatedBy] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [selectedUsers, setSelectedUsers] = useState<any[]>([])
  const [organizations, setOrganizations] = useState<{ id: string | number; name?: string; nameEn?: string }[]>([])
  const [sortState, setSortState] = useState<{ orderBy: string; order: SortType }>({ orderBy: '', order: SortType.ASC })

  const viewOnly = useMemo(() => {
    if (![Roles.superAdmin, Roles.admin, Roles.customerAdmin, Roles.user].includes(profile.roleId)) return true
    if (profile.roleId === Roles.user) {
      return !!projectId && createdBy !== profile.id
    }
    return false
  }, [profile.roleId, projectId, createdBy, profile.id])

  const userColumns: MuiTableColumn<any>[] = [
    {
      id: 'name',
      label: t('form.searchUser.column.name'),
      className: 'min-w-60',
      sortable: true,
      render: (row) => [row.firstName, row.lastName].filter(Boolean).join(' '),
    },
    {
      id: 'email',
      label: t('form.searchUser.column.email'),
      className: 'min-w-60',
      sortable: true,
      render: (row) => row.email,
    },
    {
      id: 'organization',
      label: t('form.searchUser.column.organization'),
      className: 'min-w-60',
      sortable: true,
      render: (row) => {
        let organizationName = ''
        if (row.organization) {
          organizationName = language === 'th' ? row.organization.name : row.organization.nameEn
        }
        return organizationName
      },
    },
    {
      id: 'role',
      label: t('form.searchUser.column.role'),
      className: 'min-w-40',
      sortable: true,
      render: (row) => (
        <Chip label={language === 'th' ? row.role.name : row.role.nameEn} color='primary' size='small' />
      ),
    },
    {
      id: 'subscriptions',
      label: t('form.searchUser.column.subscriptions'),
      className: 'min-w-60',
      render: (row) => (
        <div className='flex gap-2'>
          {(row.userSubscriptions as any[])
            .sort((a, b) =>
              language === 'th'
                ? a.subscription.name.localeCompare(b.subscription.name)
                : a.subscription.nameEn.localeCompare(b.subscription.nameEn),
            )
            .map(({ subscription }, idx) => (
              <Chip key={idx} label={language === 'th' ? subscription.name : subscription.nameEn} size='small' />
            ))}
        </div>
      ),
    },
  ]

  const searchUserFiltersConfig: FilterFieldConfig[] = [
    {
      name: 'keyword',
      label: '',
      type: 'text',
      placeholder: 'form.searchUser.filter.keywordPlaceholder',
      isPrimary: true,
    },
    {
      name: 'roleId',
      label: 'form.searchUser.filter.role',
      type: 'select',
      minWidth: 100,
      options: async () => await service.lookup.get({ name: 'roles' }),
    },
  ]

  const schema = Yup.object().shape({
    name: Yup.string().required(),
    detail: Yup.string().nullable(),
    organizationId: Yup.string().required(),
  })

  const {
    register,
    control,
    watch,
    handleSubmit,
    setValue,
    formState: { errors },
    getValues,
    trigger,
  } = useForm({
    resolver: yupResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      name: '',
      detail: '',
      organizationId: '',
    },
  })

  useEffect(() => {
    if (isOpenFromGallery && setForm) {
      setForm({ trigger, getValues })
    }
  }, [trigger, getValues, setForm, isOpenFromGallery])

  useEffect(() => {
    if (isOpenFromGallery && externalOrgId) {
      setValue('organizationId', externalOrgId)
    }
  }, [externalOrgId, setValue, isOpenFromGallery])

  const orgId = watch('organizationId')
  const projectName = watch('name')

  useEffect(() => {
    if (isOpenFromGallery) {
      setIsValid?.(!!projectName && !!orgId)
    }
  }, [projectName, orgId, setIsValid, isOpenFromGallery])

  // skip clearing on initial load (when project data sets organizationId)
  const initialOrgLoad = useRef(true)

  useEffect(() => {
    if (!orgId) {
      return
    }

    if (initialOrgLoad.current) {
      initialOrgLoad.current = false
      return
    }

    setSelectedUserIds([])
  }, [orgId])

  const fetchSelectedUsers = useCallback(async () => {
    if (selectedUserIds.length === 0) {
      setSelectedUsers([])
      setExternalUserIds?.([])
      return
    }
    setLoading(true)
    try {
      const { data } = await service.users.search({
        userIds: selectedUserIds,
        sortField: sortState.orderBy,
        sortOrder: sortState.order,
      })
      setSelectedUsers(data)
      setExternalUserIds?.(data.map((u) => u.id))
    } catch (err: any) {
      showAlert({
        status: 'error',
        errorCode: err?.message,
      })
    } finally {
      setLoading(false)
    }
  }, [selectedUserIds, sortState, showAlert, setExternalUserIds])

  // biome-ignore lint/correctness/useExhaustiveDependencies: To fetch selected users on userId change only
  useEffect(() => {
    fetchSelectedUsers()
  }, [selectedUserIds, fetchSelectedUsers])

  const handleRemoveUser = (row: any) => {
    showAlert({
      status: 'confirm-delete',
      showCancel: true,
      onConfirm: () => {
        setSelectedUserIds((prev) => prev.filter((x) => x !== row.id))
      },
    })
  }

  const userPickerOnSearch = useCallback(
    async (
      filters: Record<string, string>,
      page: number,
      rowsPerPage: number,
      sortState: { orderBy: string; order: SortType },
    ) => {
      const { data, total } = await service.users.search({
        keyword: filters.keyword,
        roleId: filters.roleId ? Number(filters.roleId) : undefined,
        organizationId: orgId,
        isActive: true,
        offset: page * rowsPerPage,
        limit: rowsPerPage,
        sortField: sortState.orderBy,
        sortOrder: sortState.order,
      })
      return { rows: data, totalRows: total }
    },
    [orgId],
  )

  useEffect(() => {
    const load = async () => {
      try {
        showLoading()
        // fetch organizations for the organization autocomplete
        const orgs = await service.organizations.getItem?.()
        setOrganizations(orgs || [])
        if (!projectId && viewOnly) {
          router.replace('/project')
          return
        }
        if (projectId) {
          const p: GetProjectDtoOut = await service.projects.get(projectId)
          // p is GetProjectDtoOut, set form values directly
          setValue('name', p.name || '')
          setValue('detail', p.detail ?? '')
          setValue('organizationId', p.organizationId || '')
          setCreatedBy(p.createdBy || null)
          setSelectedUserIds(p.projectUsers.map(({ userId }) => userId) || [])
        } else if (![Roles.superAdmin].includes(profile.roleId)) {
          setValue('organizationId', profile.organizationId)
        }
      } catch (err: any) {
        showAlert({
          status: 'error',
          errorCode: err?.message,
        })
      } finally {
        hideLoading()
      }
    }
    void load()
  }, [
    projectId,
    setValue,
    showLoading,
    hideLoading,
    showAlert,
    profile.organizationId,
    profile.roleId,
    router.replace,
    viewOnly,
  ])

  const save = async (data: FormValues) => {
    setLoading(true)
    try {
      const payload: Partial<PostProjectDtoIn | PutProjectDtoIn> = {
        name: data.name,
        detail: data.detail,
        organizationId: data.organizationId,
        userIds: selectedUsers.map((u) => u.id),
      }

      if (projectId) {
        await service.projects.update(projectId, payload as PutProjectDtoIn)
      } else {
        await service.projects.create(payload as PostProjectDtoIn)
      }

      showAlert({ status: 'success', title: t('alert.saveSuccess') })

      router.replace('/project')
    } catch (err: any) {
      showAlert({
        status: 'error',
        errorCode: err?.message,
      })
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = (data: unknown) => {
    showAlert({
      status: 'confirm-save',
      content: t('form.projectForm.confirmContent'),
      showCancel: true,
      onConfirm: () => {
        void save(data as FormValues)
      },
    })
  }

  const handleDelete = () => {
    showAlert({
      status: 'confirm-delete',
      showCancel: true,
      onConfirm: async () => {
        setLoading(true)
        try {
          await service.projects.delete({ ids: [projectId as string] })
          router.replace('/project')
        } catch (err: any) {
          showAlert({
            status: 'error',
            errorCode: err?.message,
          })
        } finally {
          setLoading(false)
        }
      },
    })
  }

  const handleCancel = () => {
    if (viewOnly) {
      router.replace('/project')
    } else {
      showAlert({
        status: 'confirm-cancel',
        showCancel: true,
        onConfirm: () => router.replace('/project'),
      })
    }
  }

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)

  const isOwner = !projectId || createdBy === profile.id

  const canManageUsers = useMemo(
    () =>
      [Roles.superAdmin, Roles.admin].includes(profile.roleId) ||
      ([Roles.customerAdmin, Roles.user].includes(profile.roleId) && isOwner),
    [profile.roleId, isOwner],
  )

  const canViewUsers = useMemo(
    () =>
      [Roles.superAdmin, Roles.admin, Roles.customerAdmin].includes(profile.roleId) ||
      (profile.roleId === Roles.user && isOwner),
    [profile.roleId, isOwner],
  )

  const handleSortChange = (orderBy: string, order: SortType) => {
    setSortState({ orderBy, order })
  }

  return (
    <>
      <FormWrapper
        title={
          !isOpenFromGallery ? (projectId ? t('form.projectForm.editTitle') : t('form.projectForm.addTitle')) : null
        }
        actions={
          !isOpenFromGallery && (
            <div className='flex justify-end gap-2'>
              {projectId && [Roles.superAdmin, Roles.admin].includes(profile.roleId) && !viewOnly && (
                <>
                  <Button
                    className='hidden! md:flex!'
                    variant='outlined'
                    color='error'
                    disabled={loading}
                    onClick={handleDelete}
                  >
                    {t('button.delete')}
                  </Button>
                  <Button
                    className='md:hidden! min-w-0! px-2!'
                    variant='outlined'
                    onClick={handleMenuOpen}
                    disabled={loading}
                  >
                    <MoreVertIcon />
                  </Button>
                  <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                    <MenuItem
                      className='text-error!'
                      onClick={() => {
                        setAnchorEl(null)
                        handleDelete()
                      }}
                    >
                      {t('button.delete')}
                    </MenuItem>
                  </Menu>
                </>
              )}
              <div className='flex-grow' />
              <Button variant='outlined' disabled={loading} startIcon={<CloseIcon />} onClick={handleCancel}>
                {t(viewOnly ? 'button.close' : 'button.cancel')}
              </Button>
              {!viewOnly && (
                <Button
                  variant='contained'
                  color='primary'
                  loading={loading}
                  startIcon={<SaveIcon />}
                  onClick={handleSubmit(onSubmit)}
                >
                  {t('button.save')}
                </Button>
              )}
            </div>
          )
        }
        fullWidth
        isOpenFromGallery={isOpenFromGallery}
      >
        <form className='grid grid-cols-1 gap-2'>
          <div className='flex flex-col'>
            <InputLabel required>{t('form.projectForm.name')}</InputLabel>
            <TextField
              placeholder={viewOnly ? '' : t('form.projectForm.name')}
              variant='outlined'
              fullWidth
              disabled={viewOnly}
              {...register('name')}
              error={!!errors.name}
              helperText={errors.name?.message}
            />
          </div>
          <div className='flex flex-col'>
            <InputLabel>{t('form.projectForm.detail')}</InputLabel>
            <TextField
              placeholder={viewOnly ? '' : t('form.projectForm.detail')}
              variant='outlined'
              fullWidth
              multiline
              rows={4}
              disabled={viewOnly}
              {...register('detail')}
              error={!!errors.detail}
              helperText={errors.detail?.message}
            />
          </div>
          {[Roles.superAdmin].includes(profile.roleId) && (
            <div className='flex flex-col'>
              <InputLabel required>{t('form.projectForm.organization')}</InputLabel>
              <Controller
                control={control}
                name='organizationId'
                render={({ field, fieldState }) => {
                  const selected = organizations.find((o) => String(o.id) === String(field.value)) ?? null
                  return (
                    <Autocomplete
                      disabled={viewOnly || !!externalOrgId}
                      options={organizations}
                      noOptionsText={t('filter.noOptions')}
                      getOptionLabel={(opt) => String(language === 'th' ? opt.name : opt.nameEn)}
                      isOptionEqualToValue={(option, value) => String(option.id) === String(value?.id)}
                      value={selected}
                      onChange={(_, value) => field.onChange(value ? String(value.id) : '')}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder={t('form.projectForm.organization')}
                          fullWidth
                          disabled={viewOnly || !!externalOrgId}
                          error={!!fieldState.error}
                          helperText={fieldState.error?.message}
                        />
                      )}
                    />
                  )
                }}
              />
            </div>
          )}
          {canViewUsers && (
            <>
              <div className='flex items-center gap-2 pt-2'>
                <InputLabel>{t('form.projectForm.users')}</InputLabel>
                <div className='flex items-center gap-2'>
                  <Button
                    variant='contained'
                    color='primary'
                    startIcon={<AddIcon />}
                    onClick={() => setPickerOpen(true)}
                    disabled={!orgId || viewOnly || !canManageUsers}
                  >
                    {t('form.projectForm.addUserButton')}
                  </Button>
                </div>
              </div>
              <div className='relative rounded-lg border border-(--color-divider) p-4'>
                {selectedUsers.length === 0 ? (
                  <div className='m-auto flex flex-col items-center p-4 text-(--color-action-disabled)'>
                    <InboxIcon className='mb-2 text-[80px]! opacity-(--opacity-disabled)' />
                    {t('form.projectForm.noUsersSelected')}
                  </div>
                ) : (
                  <MuiTableHOC
                    totalLabel='form.projectForm.totalProjectUser'
                    columns={userColumns}
                    rows={selectedUsers}
                    rowKey={(row: any) => row.id}
                    totalRows={selectedUsers.length}
                    onDelete={!viewOnly && canManageUsers ? handleRemoveUser : undefined}
                    sortState={sortState}
                    onSortChange={handleSortChange}
                  />
                )}
                {loading && (
                  <div className='absolute top-0 right-0 bottom-0 left-0 z-10 flex items-center justify-center backdrop-blur-sm'>
                    <CircularProgress size={80} color='primary' />
                  </div>
                )}
              </div>
            </>
          )}
        </form>
      </FormWrapper>

      <PickerDialog
        open={pickerOpen}
        title={t('form.projectForm.addUserButton')}
        columns={userColumns}
        filtersConfig={searchUserFiltersConfig}
        onSearch={userPickerOnSearch}
        onClose={() => setPickerOpen(false)}
        onConfirm={(rows) => {
          // merge new selections (avoid duplicates)
          setSelectedUserIds((prev) => {
            const existingIds = new Set(prev)
            const merged = [...prev]
            for (const r of rows) if (!existingIds.has(r.id)) merged.push(r.id)
            return merged
          })
          setPickerOpen(false)
        }}
        isRowSelectable={(row) =>
          (projectId ? createdBy : profile.id) !== row.id && !selectedUsers.some((u) => u.id === row.id)
        }
      />
    </>
  )
}

export default EditProjectForm
