import { FC, useCallback, useMemo } from 'react'
import ItvDialog from '../../../ItvDialog'
import { ItvMode } from '@/components/shared/ProjectMapView/utils/importToVisualize'
import { ItvLayerType } from '@interfaces/config'
import { CreateItvLayerDtoIn, UpdateItvLayerDtoIn } from '@interfaces/dto/import-to-visualize'
import importToVisualize from '@/api/import-to-visualize'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { useTranslation } from 'react-i18next'
import { ItvLayer } from '@interfaces/entities'
interface Props {
  projectId: string
  onClose: () => void
  onSaveComplete?: () => void
  itvMode: ItvMode | null
  layerInfo?: ItvLayer
}
const ItvVectorTile: FC<Props> = ({ projectId, onClose, onSaveComplete, itvMode, layerInfo }) => {
  const { showAlert } = useGlobalUI()
  const { t } = useTranslation('common')

  const onSave = useCallback(
    async (values: { name: string; url: string }) => {
      try {
        if (itvMode === ItvMode.Add) {
          const param: CreateItvLayerDtoIn = {
            projectId,
            name: values.name,
            url: values.url,
            layerType: ItvLayerType.VECTOR_TILE,
          }
          await importToVisualize.createLayer(param)
        } else {
          if (layerInfo?.id) {
            const param: UpdateItvLayerDtoIn = {
              projectId,
              id: layerInfo?.id,
              name: values.name,
              url: values.url,
            }
            await importToVisualize.updateLayer(param)
          }
        }
        onSaveComplete?.()
        showAlert({ status: 'success', title: t('alert.saveSuccess') })
        onClose()
      } catch (error: any) {
        showAlert({ status: 'error', errorCode: error?.message })
      }
    },
    [showAlert, projectId, onClose, onSaveComplete, t, itvMode, layerInfo],
  )

  const editValue = useMemo(() => {
    return {
      name: layerInfo?.name || '',
      url: layerInfo?.url || '',
    }
  }, [layerInfo])
  return (
    <ItvDialog
      projectId={projectId}
      onSave={onSave}
      onCancel={onClose}
      mode={itvMode}
      layerType={ItvLayerType.VECTOR_TILE}
      values={editValue}
    />
  )
}

export default ItvVectorTile
