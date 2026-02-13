import React from 'react'
import { RootModelConfig } from '@interfaces/index'
import ViewInArIcon from '@mui/icons-material/ViewInAr'
import UpdateIcon from '@mui/icons-material/Update'

type RootModelIconProps = { rootModelId: RootModelConfig; baseClass?: string }
const RootModelIcon: React.FC<RootModelIconProps> = ({ rootModelId, baseClass }) => {
  if (rootModelId === RootModelConfig.objectDetection) {
    return (
      <span className={baseClass}>
        <ViewInArIcon fontSize='small' />
      </span>
    )
  } else if (rootModelId === RootModelConfig.changeDetection) {
    return (
      <span className={baseClass}>
        <UpdateIcon fontSize='small' />
      </span>
    )
  }
  return <></>
}

export default RootModelIcon
