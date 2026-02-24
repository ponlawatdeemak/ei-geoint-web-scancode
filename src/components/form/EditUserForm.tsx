'use client'

import React, { useEffect, useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as Yup from 'yup'
import { useProfileStore, fetchAndStoreProfile } from '@/hook/useProfileStore'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import Switch from '@mui/material/Switch'
import Autocomplete from '@mui/material/Autocomplete'
import Checkbox from '@mui/material/Checkbox'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import CloseIcon from '@mui/icons-material/Close'
import SaveIcon from '@mui/icons-material/Save'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import InputLabel from '@/components/common/input/InputLabel'
import FormWrapper from '@/components/layout/FormWrapper'
import service from '@/api'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/hook/useSettings'
import { Roles } from '@interfaces/index'

type Props = { userId?: string }
type OptionItem = { id: string | number; name?: string; nameEn?: string }

type FormValues = {
  roleId?: number
  organizationId?: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  userName: string
  isActive: boolean
  subscriptionIds?: string[]
}

const EditUserForm: React.FC<Props> = ({ userId }) => {
  const router = useRouter()
  const profile = useProfileStore((state) => state.profile)!
  const { t } = useTranslation('common')
  const { language } = useSettings()
  const schema = Yup.object().shape({
    roleId: Yup.number().required(),
    organizationId: Yup.string().required(),
    firstName: Yup.string().required(),
    lastName: Yup.string().required(),
    email: Yup.string().email().required(),
    phone: Yup.string().nullable().matches(/^\d*$/, t('validation.invalidPhone')),
    userName: Yup.string().required(),
    isActive: Yup.boolean().required(),
    subscriptionIds: Yup.array().of(Yup.string()).min(1),
  })
  const { showLoading, hideLoading, showAlert } = useGlobalUI()
  const [loading, setLoading] = useState(false)
  const [viewOnly, setViewOnly] = useState(false)
  const [roles, setRoles] = useState<OptionItem[]>([])
  const [organizations, setOrganizations] = useState<OptionItem[]>([])
  const [subscriptions, setSubscriptions] = useState<OptionItem[]>([])
  const [showResendPasswordButton, setShowResendPasswordButton] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: yupResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: {
      roleId: undefined,
      organizationId: undefined,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      userName: '',
      isActive: true,
      subscriptionIds: [],
    },
  })

  const watchedOrgId = watch('organizationId')
  const initialOrgLoad = useRef(true)

  useEffect(() => {
    if (!userId && profile.roleId >= 5) {
      router.replace('/user')
      return
    }
    const fetchLookups = async () => {
      const rl = await service.lookup.get?.({ name: 'roles' })
      setRoles(userId ? rl.filter((r) => r.id >= profile?.roleId) : rl.filter((r) => r.id > profile?.roleId))

      const orgs = await service.organizations.getItem?.()
      setOrganizations(orgs)
    }

    const determineViewOnlyMode = (fetchedUser: any) => {
      if (!userId || profile?.roleId === undefined || fetchedUser.roleId === undefined) {
        return false
      }

      const pRoleId = Number(profile.roleId)
      const fRoleId = Number(fetchedUser.roleId)

      const isThcomAdminEdit = pRoleId === Roles.admin && fRoleId === Roles.admin
      const isSuperAdminEdit =
        pRoleId === Roles.superAdmin && fRoleId === Roles.superAdmin && profile.id === fetchedUser.id

      if (isThcomAdminEdit || isSuperAdminEdit) {
        return false
      }

      return pRoleId >= fRoleId
    }

    const populateUser = async (id?: string) => {
      if (!id) return
      const fetched = await service.users.get(id)
      if (!fetched) return
      if (profile.roleId > fetched.roleId) {
        router.replace('/user')
        return
      }
      setValue('roleId', fetched.roleId ?? undefined)
      setValue('organizationId', fetched.organizationId ?? undefined)
      setValue('firstName', fetched.firstName ?? '')
      setValue('lastName', fetched.lastName ?? '')
      setValue('email', fetched.email ?? '')
      setValue('phone', fetched.phone ?? '')
      setValue('userName', fetched.userName ?? '')
      setValue('isActive', !!fetched.isActive)
      if (fetched.userSubscriptions && Array.isArray(fetched.userSubscriptions)) {
        setValue(
          'subscriptionIds',
          fetched.userSubscriptions.map((s) => s.subscriptionId),
        )
      }
      setViewOnly(determineViewOnlyMode(fetched))
      setShowResendPasswordButton(fetched.isLoginFirstTime)
    }

    const load = async () => {
      try {
        showLoading()
        await fetchLookups()
        await populateUser(userId)
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
  }, [setValue, showAlert, userId, showLoading, hideLoading, profile, router.replace])

  useEffect(() => {
    const loadSubs = async () => {
      try {
        if (!watchedOrgId) {
          setSubscriptions([])
          setValue('subscriptionIds', [])
          return
        }

        setLoading(true)
        const items = await service.subscriptions.getItemByOrg(String(watchedOrgId))
        setSubscriptions(items || [])
        // clear selections on org change, but not on initial load when editing
        if (!initialOrgLoad.current) {
          setValue('subscriptionIds', [])
        }
        // after first load, mark that initial load has completed
        initialOrgLoad.current = false
      } catch (err: any) {
        showAlert({
          status: 'error',
          errorCode: err?.message,
        })
      } finally {
        setLoading(false)
      }
    }

    void loadSubs()
  }, [watchedOrgId, setValue, showAlert])

  const save = async (data: FormValues) => {
    setLoading(true)
    try {
      if (userId) {
        await service.users.patch(userId, {
          roleId: data.roleId,
          organizationId: data.organizationId,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          isActive: data.isActive,
          subscriptionIds: data.subscriptionIds ?? [],
        })

        // If editing current user, sync profile to zustand store
        if (userId === profile.id) {
          await fetchAndStoreProfile()
        }
      } else {
        await service.users.create({
          roleId: data.roleId as number,
          organizationId: data.organizationId as string,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          userName: data.userName,
          // When creating a user (create mode) the isActive input is hidden
          // and new users should be active by default.
          isActive: true,
          subscriptionIds: data.subscriptionIds ?? [],
        })
      }

      showAlert({ status: 'success', title: t('alert.saveSuccess') })

      router.replace('/user')
    } catch (err: any) {
      showAlert({
        status: 'error',
        errorCode: err?.message,
      })
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = (data: FormValues) => {
    showAlert({
      status: 'confirm-save',
      content: t('form.userForm.confirmContent'),
      showCancel: true,
      onConfirm: () => void save(data),
    })
  }

  const handleDelete = () => {
    showAlert({
      status: 'confirm-delete',
      showCancel: true,
      onConfirm: async () => {
        setLoading(true)
        try {
          await service.users.delete({ ids: [userId as string] })
          router.replace('/user')
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

  const handleResendSetupPasswordLink = () => {
    showAlert({
      status: 'info',
      showCancel: true,
      title: t('form.userForm.resendSetupPasswordLinkConfirmTitle'),
      onConfirm: async () => {
        setLoading(true)
        try {
          await service.users.resendSetupPasswordLink({ userId: userId as string })
          showAlert({ status: 'success', title: t('form.userForm.resendSetupPasswordLinkSuccessTitle') })
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

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)

  const filteredRoles = useMemo(() => {
    if (userId && viewOnly) {
      return roles
    } else if (userId) {
      return roles.filter((r) => {
        // Allow Admin to see Admin role
        if (profile.roleId === Roles.admin && Number(r.id) === Roles.admin) return true
        // Allow SuperAdmin to see SuperAdmin role
        if (profile.roleId === Roles.superAdmin && Number(r.id) === Roles.superAdmin) return true

        return Number(r.id) > profile.roleId
      })
    } else {
      return roles.filter((r) => Number(r.id) >= profile.roleId)
    }
  }, [roles, profile.roleId, userId, viewOnly])

  const isSelfEdit = userId && profile.id === userId
  const allowDelete = userId && !viewOnly && !isSelfEdit

  return (
    <FormWrapper
      title={userId ? t('form.userForm.editTitle') : t('form.userForm.addTitle')}
      actions={
        <div className='flex justify-end gap-2'>
          {/* show destructive/edit actions only when not view-only */}
          {userId && !viewOnly ? (
            <>
              {allowDelete && (
                <Button
                  className='hidden! md:flex!'
                  variant='outlined'
                  color='error'
                  disabled={loading}
                  onClick={handleDelete}
                >
                  {t('button.delete')}
                </Button>
              )}
              {showResendPasswordButton && (
                <Button
                  className='hidden! md:flex!'
                  variant='outlined'
                  disabled={loading}
                  onClick={handleResendSetupPasswordLink}
                >
                  {t('form.userForm.resendSetupPasswordLink')}
                </Button>
              )}
              <Button
                className='md:hidden! min-w-0! px-2!'
                variant='outlined'
                onClick={handleMenuOpen}
                disabled={loading || viewOnly}
              >
                <MoreVertIcon />
              </Button>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                {showResendPasswordButton && (
                  <MenuItem
                    onClick={() => {
                      setAnchorEl(null)
                      handleResendSetupPasswordLink()
                    }}
                  >
                    {t('form.userForm.resendSetupPasswordLink')}
                  </MenuItem>
                )}
                {allowDelete && (
                  <MenuItem
                    className='text-error!'
                    onClick={() => {
                      setAnchorEl(null)
                      handleDelete()
                    }}
                  >
                    {t('button.delete')}
                  </MenuItem>
                )}
              </Menu>
            </>
          ) : null}
          <div className='flex-grow' />
          <Button
            variant='outlined'
            disabled={loading}
            startIcon={<CloseIcon />}
            onClick={() => router.replace('/user')}
          >
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
      }
      fullWidth
    >
      <form className='grid grid-cols-1 gap-2 md:grid-cols-2'>
        <div className='flex flex-col'>
          <InputLabel required>{t('form.userForm.firstName')}</InputLabel>
          <TextField
            placeholder={viewOnly ? '' : t('form.userForm.firstName')}
            variant='outlined'
            fullWidth
            disabled={viewOnly}
            {...register('firstName')}
            error={!!errors.firstName}
            helperText={errors.firstName?.message}
          />
        </div>
        <div className='flex flex-col'>
          <InputLabel required>{t('form.userForm.lastName')}</InputLabel>
          <TextField
            placeholder={viewOnly ? '' : t('form.userForm.lastName')}
            variant='outlined'
            fullWidth
            disabled={viewOnly}
            {...register('lastName')}
            error={!!errors.lastName}
            helperText={errors.lastName?.message}
          />
        </div>

        <div className='flex flex-col md:col-span-2'>
          <InputLabel required>{t('form.userForm.organization')}</InputLabel>
          <FormControl>
            <Controller
              control={control}
              name='organizationId'
              render={({ field, fieldState }) => {
                const selected = organizations.find((o) => String(o.id) === String(field.value)) ?? null
                return (
                  <Autocomplete
                    options={organizations}
                    disabled={viewOnly}
                    noOptionsText={t('filter.noOptions')}
                    getOptionLabel={(opt) => String(language === 'th' ? opt.name : opt.nameEn)}
                    isOptionEqualToValue={(option, value) => String(option.id) === String(value?.id)}
                    value={selected}
                    onChange={(_, value) => field.onChange(value ? String(value.id) : undefined)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder={viewOnly ? '' : t('form.userForm.organization')}
                        fullWidth
                        disabled={viewOnly}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                )
              }}
            />
          </FormControl>
        </div>

        <div className='flex flex-col'>
          <InputLabel required>{t('form.userForm.email')}</InputLabel>
          <TextField
            placeholder={viewOnly ? '' : t('form.userForm.email')}
            variant='outlined'
            fullWidth
            disabled={viewOnly}
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
          />
        </div>
        <div className='flex flex-col'>
          <InputLabel>{t('form.userForm.phone')}</InputLabel>
          <TextField
            placeholder={viewOnly ? '' : t('form.userForm.phone')}
            variant='outlined'
            fullWidth
            disabled={viewOnly}
            {...register('phone')}
            error={!!errors.phone}
            helperText={errors.phone?.message}
          />
        </div>

        <div className='flex flex-col'>
          <InputLabel required>{t('form.userForm.userName')}</InputLabel>
          <TextField
            placeholder={viewOnly ? '' : t('form.userForm.userName')}
            variant='outlined'
            fullWidth
            disabled={viewOnly}
            {...register('userName', {
              onChange: (e) => {
                e.target.value = e.target.value.toLowerCase()
              },
            })}
            error={!!errors.userName}
            helperText={errors.userName?.message}
            slotProps={{ htmlInput: { style: { textTransform: 'lowercase' } } }}
          />
        </div>

        <div className='flex flex-col md:col-span-2'>
          <InputLabel required>{t('form.userForm.role')}</InputLabel>
          <FormControl>
            <Controller
              control={control}
              name='roleId'
              render={({ field, fieldState }) => {
                const selected = filteredRoles.find((r) => String(r.id) === String(field.value)) ?? null
                return (
                  <Autocomplete
                    disabled={viewOnly}
                    options={filteredRoles}
                    noOptionsText={t('filter.noOptions')}
                    getOptionLabel={(opt) => String(language === 'th' ? opt.name : opt.nameEn)}
                    isOptionEqualToValue={(option, value) => String(option.id) === String(value?.id)}
                    value={selected}
                    onChange={(_, value) => field.onChange(value ? Number(value.id) : undefined)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder={viewOnly ? '' : t('form.userForm.role')}
                        fullWidth
                        disabled={viewOnly}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                )
              }}
            />
          </FormControl>
        </div>

        <div className='flex flex-col md:col-span-2'>
          <InputLabel required>{t('form.userForm.subscription')}</InputLabel>
          <Controller
            control={control}
            name='subscriptionIds'
            render={({ field, fieldState }) => (
              <Autocomplete
                multiple
                disableCloseOnSelect
                options={subscriptions}
                disabled={!watchedOrgId || viewOnly}
                noOptionsText={t('filter.noOptions')}
                getOptionLabel={(opt) => String(language === 'th' ? opt.name : opt.nameEn)}
                isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
                value={subscriptions.filter((s) => (field.value || []).includes(String(s.id)))}
                onChange={(_, value) => field.onChange(value.map((v) => String(v.id)))}
                renderOption={(props, option, { selected }) => (
                  <li {...props} key={option.id} className='flex items-center gap-2'>
                    <Checkbox size='small' checked={selected} tabIndex={-1} disableRipple disabled={viewOnly} />
                    <ListItemText primary={option.name} />
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder={viewOnly ? '' : t('form.userForm.subscription')}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    disabled={!watchedOrgId || viewOnly}
                  />
                )}
              />
            )}
          />
        </div>

        {userId && (
          <div className='flex items-center md:col-span-2'>
            <Controller
              control={control}
              name='isActive'
              render={({ field }) => (
                <div className='flex items-center gap-2'>
                  <Switch checked={!!field.value} onChange={(_, v: boolean) => field.onChange(v)} disabled={viewOnly} />
                  <InputLabel>{t('form.userForm.isActive')}</InputLabel>
                </div>
              )}
            />
          </div>
        )}
      </form>
    </FormWrapper>
  )
}

export default EditUserForm
