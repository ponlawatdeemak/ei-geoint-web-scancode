export const DefaultModelColorConfig = {
  // for test
  'object_detection-road': '#DDC511CC',
  'object_detection-building': '#725947CC',
  'change_detection-road-new': '#DDC511CC',
  'change_detection-road-removed': '#DDC511CC',
  'change_detection-building-new': '#725947CC',
  'change_detection-building-removed': '#725947CC',
  'change_detection-building-expanded': '#725947CC',
  'change_detection-building-no_change': '#725947CC',
  'object_detection-building-v1': '#e91e63CC',
  'object_detection-road-v1': '#ffc107CC',

  // SAR
  'sar-battle_damage_assessment_v1-point': '#f44336CC',
  'sar-battle_damage_assessment_v1': '"#ff9800CC',

  // by model
  'object_detection-building-v1-cpu': '#e91e63CC',
  'object_detection-road-v1-cpu': '#ffc107CC',

  // weekly
  'planet-weekly-objectdetection-road': '#ffc107CC',
  'planet-weekly-objectdetection-building': '#e91e63CC',
  'planet-weekly-changedetection-road': '#ff6f00CC',
  'planet-weekly-changedetection-building': '#880e4fCC',
} as const

export type ModelColorKey = keyof typeof DefaultModelColorConfig

export const DefaultAoiColor = '#0e94facc'
