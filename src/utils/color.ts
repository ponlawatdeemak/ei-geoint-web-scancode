import { DefaultModelColorConfig, ModelColorKey } from '@interfaces/config/color.config'

export const getColorByModelId = (modelId: string): string => {
  return DefaultModelColorConfig[modelId as ModelColorKey] || '#000000FF' // Default to black if not found
}

// เพิ่มฟังก์ชันแปลง hex RGBA เป็น array [r,g,b,a]
export function hexToRGBAArray(hex: string, isAlphaReduce: boolean = false): [number, number, number, number] {
  const c = hex.replace('#', '')
  // รองรับ 8 หลัก (RRGGBBAA)
  if (c.length === 8) {
    const r = Number.parseInt(c.slice(0, 2), 16)
    const g = Number.parseInt(c.slice(2, 4), 16)
    const b = Number.parseInt(c.slice(4, 6), 16)
    const a = isAlphaReduce ? 10 : Number.parseInt(c.slice(6, 8), 16)
    return [r, g, b, a]
  }
  // รองรับ 6 หลัก (RRGGBB)
  if (c.length === 6) {
    const r = Number.parseInt(c.slice(0, 2), 16)
    const g = Number.parseInt(c.slice(2, 4), 16)
    const b = Number.parseInt(c.slice(4, 6), 16)
    return [r, g, b, isAlphaReduce ? 10 : 255]
  }
  // รองรับ 3 หลัก (RGB)
  if (c.length === 3) {
    const r = Number.parseInt(c[0] + c[0], 16)
    const g = Number.parseInt(c[1] + c[1], 16)
    const b = Number.parseInt(c[2] + c[2], 16)
    return [r, g, b, isAlphaReduce ? 10 : 255]
  }
  // ไม่ตรง format
  return [255, 255, 255, 0]
}

export const withAlpha = (color: string, alpha: number) => {
  if (!color) return color
  const c = color.trim()
  const hex = c.slice(1)
  let r = 0
  let g = 0
  let b = 0

  r = Number.parseInt(hex.slice(0, 2), 16)
  g = Number.parseInt(hex.slice(2, 4), 16)
  b = Number.parseInt(hex.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
