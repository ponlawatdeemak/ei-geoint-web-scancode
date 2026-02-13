import { FC, memo, useMemo } from 'react'
import ServiceIcon from './ServiceIcon'
import RootModelIcon from './RootModelIcon'
import { ItvLayerType, RootModelConfig, ServiceConfig } from '@interfaces/config'
import { ProjectMapViewGroup } from '@interfaces/index'
import { itvConfig } from '../../utils/importToVisualize'

const LayerIcon: FC<{ group: ProjectMapViewGroup; selectedGroup: string | null }> = ({ group, selectedGroup }) => {
  const isTaskLayer = useMemo(() => {
    return !!group.taskId
  }, [group.taskId])

  const itvIcon = useMemo(() => {
    if (
      // group.layerType === ItvLayerType.GALLERY ||
      //   group.layerType === ItvLayerType.VECTOR_TILE ||
      group.layerType === ItvLayerType.RASTER_TILE
    ) {
      return itvConfig?.[ItvLayerType.RASTER_TILE]?.icon
    } else {
      return itvConfig?.[group.layerType]?.icon
    }
  }, [group.layerType])

  return (
    <>
      {isTaskLayer ? (
        <>
          <ServiceIcon
            serviceId={group.serviceId as ServiceConfig}
            baseClass={`inline-flex h-[14px] min-h-[14px] w-[14px] min-w-[14px] items-center justify-center rounded-[3px] px-2 align-middle ${
              selectedGroup === group.groupId ? 'text-white' : 'text-(--color-text-icon)'
            }`}
          />
          <RootModelIcon
            rootModelId={group.rootModelId as RootModelConfig}
            baseClass={`inline-flex h-[14px] min-h-[14px] w-[14px] min-w-[14px] items-center justify-center rounded-[3px] px-2 align-middle ${
              selectedGroup === group.groupId ? 'text-white' : 'text-(--color-text-icon)'
            }`}
          />
        </>
      ) : group.layerType === ItvLayerType.TASK ? (
        <div></div>
      ) : (
        itvIcon
      )}
    </>
  )
}

export default memo(LayerIcon)
