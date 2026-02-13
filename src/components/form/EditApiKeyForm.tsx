'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, type Resolver } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as Yup from 'yup'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import InputLabel from '@/components/common/input/InputLabel'
import FormWrapper from '@/components/layout/FormWrapper'
import CloseIcon from '@mui/icons-material/Close'
import SaveIcon from '@mui/icons-material/Save'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/hook/useSettings'
import service from '@/api'
import { CreateOrganizationApiKeyDtoIn, UpdateOrganizationApiKeyDtoIn } from '@interfaces/dto/organization-api-key'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { Select, Chip, Alert, Box, IconButton, InputAdornment } from '@mui/material'
import { Visibility, VisibilityOff, ContentCopy } from '@mui/icons-material'

type Props = {
  apiKeyId?: string
}

type FormValues = {
  orgId: string
  name?: string
}

const EditApiKeyForm: React.FC<Props> = ({ apiKeyId }) => {
  const router = useRouter()
  const { t } = useTranslation('common')
  const { language } = useSettings()
  const { showLoading, hideLoading, showAlert } = useGlobalUI()
  const [loading, setLoading] = useState(false)
  const [organizations, setOrganizations] = useState<any[]>([])
  const [apiKeyData, setApiKeyData] = useState<any>(null)
  const [showKey, setShowKey] = useState(false)
  const [newApiKey, setNewApiKey] = useState<string>('')

  const schema = Yup.object().shape({
    orgId: Yup.string().required(),
    name: Yup.string().optional(),
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      orgId: '',
      name: '',
    },
  })

  const orgIdWatch = watch('orgId')

  useEffect(() => {
    const load = async () => {
      try {
        showLoading()

        // Load organizations for the dropdown
        const orgs = await service.organizations.getItem()
        setOrganizations(orgs)

        if (apiKeyId) {
          // For edit mode, we would need to get the API key details
          // Note: Since we don't have a get single API key endpoint in the DTO,
          // we might need to search or modify the API to support getting a single key
          // For now, we'll set the form to edit mode but with limited data
          setApiKeyData({ id: apiKeyId })
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
  }, [apiKeyId, setValue, showLoading, hideLoading, showAlert])

  const save = async (data: FormValues) => {
    setLoading(true)
    try {
      if (apiKeyId) {
        // Update existing API key (deactivate/reactivate)
        const payload: UpdateOrganizationApiKeyDtoIn = {
          apiKeyId: apiKeyId,
        }
        await service.apiKeys.update(payload)
        showAlert({ status: 'success', title: t('alert.saveSuccess') })
      } else {
        // Create new API key
        const payload: CreateOrganizationApiKeyDtoIn = {
          orgId: data.orgId,
        }
        const result = await service.apiKeys.create(payload)
        setNewApiKey(result.id) // This would be the actual API key string from the server
        showAlert({ status: 'success', title: t('form.apiKeyForm.createSuccess') })
        return // Don't redirect immediately so user can copy the key
      }

      router.replace('/api-management')
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
    const actionType = apiKeyId ? 'update' : 'create'
    showAlert({
      status: 'confirm-save',
      content: t(`form.apiKeyForm.confirm${actionType === 'create' ? 'Create' : 'Update'}Content`),
      showCancel: true,
      onConfirm: () => {
        void save(data as FormValues)
      },
    })
  }

  const handleDeactivate = () => {
    showAlert({
      status: 'confirm-delete',
      title: t('form.apiKeyForm.deactivateTitle'),
      content: t('form.apiKeyForm.deactivateContent'),
      showCancel: true,
      onConfirm: async () => {
        setLoading(true)
        try {
          const payload: UpdateOrganizationApiKeyDtoIn = {
            apiKeyId: apiKeyId!,
          }
          await service.apiKeys.update(payload)
          showAlert({ status: 'success', title: t('form.apiKeyForm.deactivateSuccess') })
          router.replace('/api-management')
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

  const copyToClipboard = () => {
    navigator.clipboard.writeText(newApiKey)
    showAlert({ status: 'success', title: t('form.apiKeyForm.copiedToClipboard') })
  }

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)

  const selectedOrganization = organizations.find((org) => org.id === orgIdWatch)

  return (
    <FormWrapper
      title={apiKeyId ? t('form.apiKeyForm.editTitle') : t('form.apiKeyForm.addTitle')}
      actions={
        <div className='flex justify-end gap-2'>
          {apiKeyId ? (
            <>
              <Button
                className='hidden! md:flex!'
                variant='outlined'
                color='error'
                disabled={loading}
                onClick={handleDeactivate}
              >
                {t('form.apiKeyForm.deactivate')}
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
                    handleDeactivate()
                  }}
                >
                  {t('form.apiKeyForm.deactivate')}
                </MenuItem>
              </Menu>
            </>
          ) : null}
          <div className='flex-grow' />
          <Button
            variant='outlined'
            disabled={loading}
            startIcon={<CloseIcon />}
            onClick={() => router.replace('/api-management')}
          >
            {t('button.cancel')}
          </Button>
          {!newApiKey && (
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
          {newApiKey && (
            <Button variant='contained' color='primary' onClick={() => router.replace('/api-management')}>
              {t('button.done')}
            </Button>
          )}
        </div>
      }
      fullWidth
    >
      <form className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        {newApiKey && (
          <div className='md:col-span-2'>
            <Alert severity='success' sx={{ mb: 2 }}>
              <strong>{t('form.apiKeyForm.apiKeyCreated')}</strong>
              <br />
              {t('form.apiKeyForm.copyKeyWarning')}
            </Alert>

            <Box className='mt-2'>
              <InputLabel>{t('form.apiKeyForm.newApiKey')}</InputLabel>
              <TextField
                value={newApiKey}
                type={showKey ? 'text' : 'password'}
                variant='outlined'
                fullWidth
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position='end'>
                      <IconButton onClick={() => setShowKey(!showKey)} edge='end'>
                        {showKey ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                      <IconButton onClick={copyToClipboard} edge='end'>
                        <ContentCopy />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          </div>
        )}

        <div className='flex flex-col md:col-span-2'>
          <InputLabel required>{t('form.apiKeyForm.organization')}</InputLabel>
          <Select
            value={orgIdWatch}
            onChange={(e) => setValue('orgId', e.target.value)}
            displayEmpty
            disabled={!!apiKeyId || !!newApiKey}
            error={!!errors.orgId}
          >
            <MenuItem value='' disabled>
              {t('form.apiKeyForm.selectOrganization')}
            </MenuItem>
            {organizations.map((org) => (
              <MenuItem key={org.id} value={org.id}>
                {language === 'th' ? org.name : org.nameEn}
              </MenuItem>
            ))}
          </Select>
          {errors.orgId && <div className='mt-1 text-error text-sm'>{errors.orgId.message}</div>}
        </div>

        {selectedOrganization && (
          <div className='md:col-span-2'>
            <Box className='rounded-lg bg-(--color-background-default) p-4'>
              <div className='mb-2 font-medium text-lg text-primary'>{t('form.apiKeyForm.organizationDetails')}</div>
              <div className='grid gap-2 md:grid-cols-2'>
                <div>
                  <InputLabel>{t('form.apiKeyForm.organizationName')}</InputLabel>
                  <div className='text-sm'>
                    {language === 'th' ? selectedOrganization.name : selectedOrganization.nameEn}
                  </div>
                </div>
                <div>
                  <InputLabel>{t('form.apiKeyForm.organizationId')}</InputLabel>
                  <div className='font-mono text-sm'>{selectedOrganization.id}</div>
                </div>
              </div>
            </Box>
          </div>
        )}

        {apiKeyData && (
          <div className='md:col-span-2'>
            <Box className='rounded-lg bg-(--color-background-default) p-4'>
              <div className='mb-2 font-medium text-lg text-primary'>{t('form.apiKeyForm.apiKeyDetails')}</div>
              <div className='grid gap-2 md:grid-cols-2'>
                <div>
                  <InputLabel>{t('form.apiKeyForm.status')}</InputLabel>
                  <Chip
                    label={
                      apiKeyData.isActive
                        ? t('form.searchApiKey.status.active')
                        : t('form.searchApiKey.status.inactive')
                    }
                    color={apiKeyData.isActive ? 'success' : 'error'}
                    size='small'
                  />
                </div>
                <div>
                  <InputLabel>{t('form.apiKeyForm.createdAt')}</InputLabel>
                  <div className='text-sm'>
                    {apiKeyData.createdAt ? new Date(apiKeyData.createdAt).toLocaleString(language) : ''}
                  </div>
                </div>
              </div>
            </Box>
          </div>
        )}

        {!apiKeyId && !newApiKey && (
          <div className='md:col-span-2'>
            <Alert severity='info'>{t('form.apiKeyForm.createInfo')}</Alert>
          </div>
        )}
      </form>
    </FormWrapper>
  )
}

export default EditApiKeyForm
