import { Dispatch, FC, SetStateAction, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import ItvDialog from '../../../ItvDialog'
import { ItvMode } from '@/components/shared/ProjectMapView/utils/importToVisualize'
import { ItvLayerType } from '@interfaces/config'
import { CreateItvLayerDtoIn, UpdateItvLayerDtoIn } from '@interfaces/dto/import-to-visualize'
import importToVisualize from '@/api/import-to-visualize'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { useTranslation } from 'react-i18next'
import { ItvFeatureProperties, ItvLayer } from '@interfaces/entities'
import { Button, Divider } from '@mui/material'
import PhotoList from './PhotoList'
import { ItvPhotoFeature } from './itv-photo'
import PhotoLocator from './PhotoLocator'
import CloseIcon from '@mui/icons-material/Close'
import SaveIcon from '@mui/icons-material/Save'
import { Point } from 'geojson'
import PhotoUploader from './PhotoUploader'

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
const ItvPhoto: FC<Props> = ({
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

  const [photoList, setPhotoList] = useState<ItvPhotoFeature[]>([])
  const [showLocator, setShowLocator] = useState(false)
  const [uploadIdListDelete, setUploadIdListDelete] = useState<string[]>([])

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
          layerType: ItvLayerType.PHOTO,
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

  const onEditLatlng = useCallback((editList: ItvFeatureProperties[]) => {
    setPhotoList(
      editList.map((item) => ({
        id: item.id,
        fileName: item.photoFileName as string,
        uploadId: item.photoUploadId as string,
        groupId: item.photoGroupId,
        geometry: item.geometry as Point,
        createdAt: item.createdAt,
        selected: false,
        photoItem: item,
      })),
    )
    setShowLocator(true)
  }, [])

  const featureList = useMemo(() => {
    return layerInfo?.features?.filter((item) => !uploadIdListDelete.includes(item.photoUploadId as string)) || []
  }, [layerInfo, uploadIdListDelete])

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
          uploadIdListDelete,
        }
        try {
          await importToVisualize.updateLayer(param)
          setUploadIdListDelete([])
          const newLayer = { ...layerInfo, features: featureList }
          setLayerInfo(newLayer)
          setPhotoList([])
          showAlert({
            status: 'success',
            title: t('alert.saveSuccess'),
          })
        } catch (error: any) {
          showAlert({
            status: 'error',
            errorCode: error?.message,
          })
        }
      },
    })
  }, [uploadIdListDelete, featureList, layerInfo, showAlert, setLayerInfo, t])

  const onDeletePhoto = useCallback((uploadIdList: string[]) => {
    setUploadIdListDelete((prev) => [...prev, ...uploadIdList])
  }, [])

  return (
    <div>
      {showDialog && (
        <ItvDialog
          projectId={projectId}
          onSave={onSaveLayerName}
          onCancel={onCancelDialog}
          mode={itvMode}
          layerType={ItvLayerType.PHOTO}
          values={editValue}
        />
      )}

      {showForm && (
        <div>
          {layerInfo && (
            <PhotoUploader
              setPhotoList={setPhotoList}
              layerInfo={layerInfo}
              setLayerInfo={setLayerInfo}
              projectId={projectId}
              onUpdateItvLayers={onUpdateItvLayers}
              setShowLocator={setShowLocator}
            />
          )}

          <div className='mt-4 space-y-3 sm:mt-6 sm:space-y-4'>
            {layerInfo && (
              <PhotoList features={featureList} onEdit={onEditLatlng} onDelete={onDeletePhoto} projectId={projectId} />
            )}

            {layerInfo && showLocator && (
              <PhotoLocator
                photoList={photoList}
                setPhotoList={setPhotoList}
                onClose={() => setShowLocator(false)}
                layerInfo={layerInfo}
                setLayerInfo={setLayerInfo}
              />
            )}

            <div className='flex flex-col gap-4'>
              <Divider />
              <div className='flex items-center justify-center gap-2'>
                <Button variant='outlined' onClick={onClose} startIcon={<CloseIcon />}>
                  {t('button.cancel')}
                </Button>
                <Button
                  variant='contained'
                  color='primary'
                  disabled={uploadIdListDelete.length === 0}
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

export default ItvPhoto
