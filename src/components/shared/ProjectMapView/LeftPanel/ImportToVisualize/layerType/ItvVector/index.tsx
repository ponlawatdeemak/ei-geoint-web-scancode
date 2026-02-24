import { Dispatch, FC, SetStateAction, useCallback, useEffect, useMemo, useState } from 'react'
import ItvDialog from '../../../ItvDialog'
import { ItvMode } from '@/components/shared/ProjectMapView/utils/importToVisualize'
import { ItvLayerType } from '@interfaces/config'
import { CreateItvLayerDtoIn, UpdateItvLayerDtoIn } from '@interfaces/dto/import-to-visualize'
import importToVisualize from '@/api/import-to-visualize'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { useTranslation } from 'react-i18next'
import { ItvLayer } from '@interfaces/entities'
import { Button, Divider } from '@mui/material'
import VectorList from './VectorList'
import CloseIcon from '@mui/icons-material/Close'
import SaveIcon from '@mui/icons-material/Save'
import VectorUploader from './VectorUploader'

interface Props {
  projectId: string
  onClose: () => void
  onSaveComplete?: (value?: ItvLayer) => void
  itvMode: ItvMode | null
  layerInfo?: ItvLayer
  setLayerInfo: Dispatch<SetStateAction<ItvLayer | undefined>>
  editingLayerName: boolean
  setEditingLayerName: (v: boolean) => void
  onToggleLayer: (id: string, isVisible: boolean) => void
  onUpdateItvLayers: Dispatch<SetStateAction<ItvLayer[]>>
}
const ItvVector: FC<Props> = ({
  projectId,
  onClose,
  onSaveComplete,
  itvMode,
  layerInfo,
  setLayerInfo,
  editingLayerName,
  setEditingLayerName,
  onUpdateItvLayers,
}) => {
  const { showAlert } = useGlobalUI()
  const { t } = useTranslation('common')

  const [showDialog, setShowDialog] = useState(false)
  const [showForm, setShowForm] = useState(true)
  const [updateIdList, setUpdateIdList] = useState<string[]>([])

  useEffect(() => {
    if (itvMode === ItvMode.Add || editingLayerName) {
      setShowDialog(true)
    } else {
      setShowDialog(false)
    }
  }, [itvMode, editingLayerName])

  useEffect(() => {
    if (itvMode === ItvMode.Add) {
      setShowForm(false)
    } else {
      setShowForm(true)
    }
  }, [itvMode])

  const onSaveLayerName = useCallback(
    async (values: { name: string }) => {
      if (itvMode === ItvMode.Add) {
        const param: CreateItvLayerDtoIn = {
          projectId,
          name: values.name,
          layerType: ItvLayerType.VECTOR,
        }
        const res = await importToVisualize.createLayer(param)
        onSaveComplete?.(res.data)
        onUpdateItvLayers((prev) => [...prev, res.data])
      } else {
        if (layerInfo?.id) {
          const param: UpdateItvLayerDtoIn = {
            projectId,
            id: layerInfo?.id,
            name: values.name,
          }
          await importToVisualize.updateLayer(param)
          setEditingLayerName(false)
          const newLayer = { ...layerInfo, name: values.name }
          setLayerInfo(newLayer)
        }
      }

      showAlert({ status: 'success', title: t('alert.saveSuccess') })
    },
    [showAlert, projectId, onSaveComplete, t, itvMode, layerInfo, setEditingLayerName, setLayerInfo, onUpdateItvLayers],
  )

  const editValue = useMemo(() => {
    return {
      name: layerInfo?.name || '',
    }
  }, [layerInfo])

  const onCancelDialog = useCallback(() => {
    if (itvMode === ItvMode.Add) {
      onClose()
    } else {
      setEditingLayerName(false)
    }
  }, [itvMode, onClose, setEditingLayerName])

  const featureList = useMemo(() => {
    return layerInfo?.features || []
  }, [layerInfo])

  useEffect(() => {
    const newLayer = { ...layerInfo, features: featureList }
    onUpdateItvLayers((prev) => {
      const temp = [...prev]
      const index = temp.findIndex((layer) => layer.id === layerInfo?.id)
      if (index > -1) {
        temp[index] = newLayer as ItvLayer
      }
      return temp
    })
  }, [layerInfo, featureList, onUpdateItvLayers])

  const onSave = useCallback(() => {
    if (!layerInfo) return
    showAlert({
      status: 'confirm-save',
      showCancel: true,
      async onConfirm() {
        const param: UpdateItvLayerDtoIn = {
          projectId: layerInfo.projectId,
          id: layerInfo.id,
          features: featureList,
          name: layerInfo.name,
        }
        try {
          await importToVisualize.updateLayer(param)
          setUpdateIdList([])
          showAlert({ status: 'success', title: t('alert.saveSuccess') })
        } catch (error: any) {
          showAlert({ status: 'error', errorCode: error?.message })
        }
      },
    })
  }, [featureList, layerInfo, showAlert, t])

  const onDeleteVector = useCallback(
    (vectorId: string) => {
      const newLayer = { ...layerInfo, features: layerInfo?.features?.filter((item) => item.id !== vectorId) }
      setLayerInfo(newLayer as ItvLayer)
      setUpdateIdList((prev) => {
        const isExist = prev.includes(vectorId)
        if (isExist) {
          return prev.filter((item) => item !== vectorId)
        } else {
          return [...prev, vectorId]
        }
      })
    },
    [layerInfo, setLayerInfo],
  )

  const onUploadChange = useCallback((updateIdList: string[]) => {
    setUpdateIdList((prev) => [...prev, ...updateIdList])
  }, [])

  return (
    <div className='h-full'>
      {showDialog && (
        <ItvDialog
          projectId={projectId}
          onSave={onSaveLayerName}
          onCancel={onCancelDialog}
          mode={itvMode}
          layerType={ItvLayerType.VECTOR}
          values={editValue}
        />
      )}

      {showForm && (
        <div className='flex h-full flex-col overflow-hidden'>
          {layerInfo && (
            <VectorUploader
              layerInfo={layerInfo}
              setLayerInfo={setLayerInfo}
              onUpdateItvLayers={onUpdateItvLayers}
              onUploadChange={onUploadChange}
            />
          )}

          <div className='mt-4 flex flex-1 flex-col space-y-3 overflow-hidden sm:mt-6 sm:space-y-4'>
            {layerInfo && <VectorList features={featureList} onDelete={onDeleteVector} projectId={projectId} />}

            <div className='flex flex-col gap-4'>
              <Divider />
              <div className='flex items-center justify-center gap-2'>
                <Button variant='outlined' onClick={onClose} startIcon={<CloseIcon />}>
                  {t('button.cancel')}
                </Button>
                <Button
                  variant='contained'
                  color='primary'
                  disabled={updateIdList.length === 0}
                  onClick={onSave}
                  startIcon={<SaveIcon />}
                >
                  {t('button.save')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ItvVector
