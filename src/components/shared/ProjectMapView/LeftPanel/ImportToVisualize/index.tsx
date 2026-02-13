import { Button, IconButton, Tooltip } from '@mui/material'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import { Dispatch, FC, SetStateAction, useEffect, useMemo, useState } from 'react'
import EditIcon from '@mui/icons-material/Edit'
import { ItvLayerType } from '@interfaces/index'

import ItvRasterTile from './layerType/ItvRasterTile'
import ItvPhoto from './layerType/ItvPhoto'
import ItvVectorTile from './layerType/ItvVectorTile'
import ItvDraw from './layerType/ItvDraw'
import ItvVector from './layerType/ItvVector'
import ItvGallery from './layerType/ItvGallery'
import { ItvMode } from '../../utils/importToVisualize'
import { ItvLayer } from '@interfaces/entities'
import ItvAnnotation from './layerType/ItvAnnotation'
import { useTranslation } from 'react-i18next'
interface ImportToVisualizeProps {
  projectId: string
  onBack: () => void
  layerInfo?: ItvLayer
  setLayerInfo: Dispatch<SetStateAction<ItvLayer | undefined>>
  layerType: ItvLayerType | null
  onSaveComplete?: (value?: ItvLayer) => void
  currentItv: ItvLayerType | null
  itvMode: ItvMode | null
  onToggleLayer: (id: string, isVisible: boolean) => void
  mapId: string
  onUpdateItvLayers: Dispatch<SetStateAction<ItvLayer[]>>
}
const ImportToVisualize: FC<ImportToVisualizeProps> = ({
  projectId,
  onBack,
  layerInfo,
  setLayerInfo,
  layerType,
  onSaveComplete,
  currentItv,
  itvMode,
  onToggleLayer,
  mapId,
  onUpdateItvLayers,
}) => {
  const [editingLayerName, setEditingLayerName] = useState(false)
  const [forceHideBackButtonRow, setForceHideBackButtonRow] = useState<boolean>(false)
  const { t } = useTranslation('common')

  const showBackButtonRow = useMemo(() => {
    const isShowType =
      currentItv === ItvLayerType.GALLERY ||
      currentItv === ItvLayerType.RASTER_TILE ||
      currentItv === ItvLayerType.VECTOR_TILE
    return !forceHideBackButtonRow && !isShowType && itvMode === ItvMode.Edit
  }, [itvMode, currentItv, forceHideBackButtonRow])

  return (
    <div
      className={`${(itvMode === null || itvMode === ItvMode.Add) || (itvMode === ItvMode.Edit && (currentItv === ItvLayerType.RASTER_TILE || currentItv === ItvLayerType.VECTOR_TILE)) ? '' : 'flex h-full flex-col overflow-hidden'}`}
    >
      {showBackButtonRow && (
        <div className='mb-2 flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <div className='flex items-center gap-2'>
              <Tooltip title={t('button.back')} arrow>
                <IconButton onClick={onBack} color='primary' size='small'>
                  <ArrowBackIosNewIcon fontSize='small' />
                </IconButton>
              </Tooltip>
            </div>
            <div>{layerInfo?.name || '-'}</div>
          </div>
          <Tooltip title={t('button.editName')} arrow>
            <IconButton onClick={() => setEditingLayerName(true)} color='primary' size='small'>
              <EditIcon fontSize='small' />
            </IconButton>
          </Tooltip>
        </div>
      )}
      <div
        className={`${(itvMode === null || itvMode === ItvMode.Add) || (itvMode === ItvMode.Edit && (currentItv === ItvLayerType.RASTER_TILE || currentItv === ItvLayerType.VECTOR_TILE)) ? '' : 'flex-1 overflow-hidden'}`}
      >
        {layerType === ItvLayerType.GALLERY && (
          <ItvGallery onClose={onBack} projectId={projectId} onSaveComplete={onSaveComplete} />
        )}
        {layerType === ItvLayerType.VECTOR_TILE && (
          <ItvVectorTile
            onClose={onBack}
            projectId={projectId}
            onSaveComplete={onSaveComplete}
            itvMode={itvMode}
            layerInfo={layerInfo}
          />
        )}
        {layerType === ItvLayerType.RASTER_TILE && (
          <ItvRasterTile
            onClose={onBack}
            projectId={projectId}
            onSaveComplete={onSaveComplete}
            itvMode={itvMode}
            layerInfo={layerInfo}
          />
        )}
        {layerType === ItvLayerType.PHOTO && (
          <ItvPhoto
            onClose={onBack}
            projectId={projectId}
            onSaveComplete={onSaveComplete}
            itvMode={itvMode}
            layerInfo={layerInfo}
            setLayerInfo={setLayerInfo}
            editingLayerName={editingLayerName}
            setEditingLayerName={setEditingLayerName}
            onToggleLayer={onToggleLayer}
            onUpdateItvLayers={onUpdateItvLayers}
          />
        )}
        {layerType === ItvLayerType.VECTOR && (
          <ItvVector
            onClose={onBack}
            projectId={projectId}
            onSaveComplete={onSaveComplete}
            itvMode={itvMode}
            layerInfo={layerInfo}
            setLayerInfo={setLayerInfo}
            editingLayerName={editingLayerName}
            setEditingLayerName={setEditingLayerName}
            onToggleLayer={onToggleLayer}
            onUpdateItvLayers={onUpdateItvLayers}
          />
        )}
        {layerType === ItvLayerType.DRAW && (
          <ItvDraw
            onClose={onBack}
            projectId={projectId}
            mapId={mapId}
            onSaveComplete={onSaveComplete}
            itvMode={itvMode}
            layerInfo={layerInfo}
            setLayerInfo={setLayerInfo}
            editingLayerName={editingLayerName}
            setEditingLayerName={setEditingLayerName}
            onToggleLayer={onToggleLayer}
          />
        )}
        {layerType === ItvLayerType.ANNOTATION && (
          <ItvAnnotation
            mapId={mapId}
            onClose={onBack}
            projectId={projectId}
            onSaveComplete={onSaveComplete}
            itvMode={itvMode}
            layerInfo={layerInfo}
            setLayerInfo={setLayerInfo}
            editingLayerName={editingLayerName}
            setEditingLayerName={setEditingLayerName}
            setForceHideBackButtonRow={setForceHideBackButtonRow}
            onToggleLayer={onToggleLayer}
          />
        )}
      </div>
    </div>
  )
}

export default ImportToVisualize
