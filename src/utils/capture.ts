import html2canvas from 'html2canvas'

export const captureMapImage = async (div: HTMLDivElement) => {
  if (!div) return null

  try {
    const canvas = await html2canvas(div, {
      useCORS: true,
      allowTaint: true,
      scale: 2,
    })
    const dataURL = canvas.toDataURL('image/png')
    return dataURL
  } catch (error) {
    console.error('Error capturing div:', error)
    return null
  }
}

export const captureMapControlImage = async (scaleElement: HTMLElement) => {
  if (!scaleElement) return null

  // Get device pixel ratio (DPR) for high-resolution capture
  const dpr = window.devicePixelRatio || 1

  try {
    const canvas = await html2canvas(scaleElement, {
      backgroundColor: null, // Transparent background
      logging: false,
      useCORS: true,
      scale: dpr, // High-resolution capture
    })
    const dataURL = canvas.toDataURL('image/png')
    return dataURL
  } catch (error) {
    console.error('Error capturing div:', error)
    return null
  }
}

export const captureMapWithControl = async (
  base64Map: string,
  base64Swipe: string,
  width: number,
  height: number,
): Promise<string> => {
  return new Promise((resolve, reject): void => {
    // Get device pixel ratio (DPR) for high-resolution capture
    const dpr = window.devicePixelRatio || 1

    const finalCanvas = document.createElement('canvas')
    finalCanvas.width = width * dpr // Adjust based on DPR
    finalCanvas.height = height * dpr
    const ctx = finalCanvas.getContext('2d')

    // If no control image, just return the map image
    if (!base64Swipe || base64Swipe === '') {
      const img = new Image()
      img.onload = () => {
        if (ctx) {
          ctx.scale(dpr, dpr)
          ctx.drawImage(img, 0, 0, width, height)
          resolve(ctx.canvas.toDataURL('image/png'))
        } else {
          reject(new Error('Canvas context not available'))
        }
      }
      img.onerror = () => reject(new Error('Failed to load map image'))
      img.src = base64Map
      return
    }

    let imgLoadCounter = 0
    const img1 = new Image()
    const img2 = new Image()
    const imgLoad = (): void => {
      imgLoadCounter++
      if (ctx && imgLoadCounter === 2) {
        ctx.scale(dpr, dpr)
        ctx.drawImage(img1, 0, 0, width, height)
        const scaleWidth = img2.width / dpr
        const scaleHeight = img2.height / dpr
        const scaleX = width - scaleWidth
        const scaleY = height - scaleHeight
        ctx.drawImage(img2, scaleX, scaleY, scaleWidth, scaleHeight)
        resolve(ctx.canvas.toDataURL('image/png'))
      }
    }
    img1.onload = imgLoad
    img2.onload = imgLoad
    img1.onerror = () => reject(new Error('Failed to load map image'))
    img2.onerror = () => reject(new Error('Failed to load control image'))
    img1.src = base64Map
    img2.src = base64Swipe
  })
}
