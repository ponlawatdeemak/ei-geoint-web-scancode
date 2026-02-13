import { ServiceConfig } from '@interfaces/index'

import SatelliteAltIcon from '@mui/icons-material/SatelliteAlt'
import SensorsIcon from '@mui/icons-material/Sensors'

type ServiceIconProps = { serviceId: ServiceConfig; baseClass?: string }
const ServiceIcon: React.FC<ServiceIconProps> = ({ serviceId, baseClass }) => {
  if (serviceId === ServiceConfig.optical) {
    return (
      <span className={baseClass}>
        <SatelliteAltIcon fontSize='small' />
      </span>
    )
  } else if (serviceId === ServiceConfig.sar) {
    return (
      <span className={baseClass}>
        <SensorsIcon fontSize='small' />
      </span>
    )
  }
  return <></>
}

export default ServiceIcon
