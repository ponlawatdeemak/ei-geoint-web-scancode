/**
 * Crops transparent/empty pixels from the left and right sides of an image
 * Leaves the top and bottom intact to preserve vertical centering
 * @param imageData - ImageData object from canvas
 * @returns Cropped ImageData with left/right padding removed
 */
export const cropImageLeftRight = (imageData: ImageData): ImageData => {
  const { data, width, height } = imageData
  const pixelIndex = 4 // RGBA = 4 bytes per pixel

  // Helper function to check if a pixel is transparent (alpha === 0)
  const isPixelTransparent = (x: number, y: number): boolean => {
    const index = (y * width + x) * pixelIndex + 3 // Alpha channel
    return data[index] === 0
  }

  // Helper function to check if entire column is transparent
  const isColumnTransparent = (x: number): boolean => {
    for (let y = 0; y < height; y++) {
      if (!isPixelTransparent(x, y)) {
        return false
      }
    }
    return true
  }

  // Find leftmost non-transparent column
  let leftBound = 0
  for (let x = 0; x < width; x++) {
    if (!isColumnTransparent(x)) {
      leftBound = x
      break
    }
  }

  // Find rightmost non-transparent column
  let rightBound = width
  for (let x = width - 1; x >= 0; x--) {
    if (!isColumnTransparent(x)) {
      rightBound = x + 1
      break
    }
  }

  // If entire image is transparent, return as is
  if (leftBound >= rightBound) {
    return imageData
  }

  // Create new cropped ImageData
  const croppedWidth = rightBound - leftBound
  const croppedData = new Uint8ClampedArray(croppedWidth * height * pixelIndex)

  // Copy pixel data from source to cropped area
  for (let y = 0; y < height; y++) {
    for (let x = leftBound; x < rightBound; x++) {
      const srcIndex = (y * width + x) * pixelIndex
      const dstIndex = (y * croppedWidth + (x - leftBound)) * pixelIndex

      // Copy RGBA values
      croppedData[dstIndex] = data[srcIndex] // R
      croppedData[dstIndex + 1] = data[srcIndex + 1] // G
      croppedData[dstIndex + 2] = data[srcIndex + 2] // B
      croppedData[dstIndex + 3] = data[srcIndex + 3] // A
    }
  }

  return new ImageData(croppedData, croppedWidth, height)
}

/**
 * Helper function to find all bounds (left, right, top, bottom)
 */
function findImageBounds(
  width: number,
  height: number,
  isColumnTransparent: (x: number) => boolean,
  isRowTransparent: (y: number) => boolean,
): { leftBound: number; rightBound: number; topBound: number; bottomBound: number } {
  let leftBound = 0
  for (let x = 0; x < width; x++) {
    if (!isColumnTransparent(x)) {
      leftBound = x
      break
    }
  }

  let rightBound = width
  for (let x = width - 1; x >= 0; x--) {
    if (!isColumnTransparent(x)) {
      rightBound = x + 1
      break
    }
  }

  let topBound = 0
  for (let y = 0; y < height; y++) {
    if (!isRowTransparent(y)) {
      topBound = y
      break
    }
  }

  let bottomBound = height
  for (let y = height - 1; y >= 0; y--) {
    if (!isRowTransparent(y)) {
      bottomBound = y + 1
      break
    }
  }

  return { leftBound, rightBound, topBound, bottomBound }
}

/**
 * Crops transparent/empty pixels from all sides of an image
 * @param imageData - ImageData object from canvas
 * @returns Cropped ImageData with all padding removed
 */
export const cropImageAllSides = (imageData: ImageData): ImageData => {
  const { data, width, height } = imageData
  const pixelIndex = 4 // RGBA = 4 bytes per pixel

  // Helper function to check if a pixel is transparent (alpha === 0)
  const isPixelTransparent = (x: number, y: number): boolean => {
    const index = (y * width + x) * pixelIndex + 3 // Alpha channel
    return data[index] === 0
  }

  // Helper function to check if entire column is transparent
  const isColumnTransparent = (x: number): boolean => {
    for (let y = 0; y < height; y++) {
      if (!isPixelTransparent(x, y)) {
        return false
      }
    }
    return true
  }

  // Helper function to check if entire row is transparent
  const isRowTransparent = (y: number): boolean => {
    for (let x = 0; x < width; x++) {
      if (!isPixelTransparent(x, y)) {
        return false
      }
    }
    return true
  }

  // Find bounds
  const { leftBound, rightBound, topBound, bottomBound } = findImageBounds(
    width,
    height,
    isColumnTransparent,
    isRowTransparent,
  )

  // If entire image is transparent, return as is
  if (leftBound >= rightBound || topBound >= bottomBound) {
    return imageData
  }

  // Create new cropped ImageData
  const croppedWidth = rightBound - leftBound
  const croppedHeight = bottomBound - topBound
  const croppedData = new Uint8ClampedArray(croppedWidth * croppedHeight * pixelIndex)

  // Copy pixel data from source to cropped area
  for (let y = topBound; y < bottomBound; y++) {
    for (let x = leftBound; x < rightBound; x++) {
      const srcIndex = (y * width + x) * pixelIndex
      const dstIndex = ((y - topBound) * croppedWidth + (x - leftBound)) * pixelIndex

      // Copy RGBA values
      croppedData[dstIndex] = data[srcIndex] // R
      croppedData[dstIndex + 1] = data[srcIndex + 1] // G
      croppedData[dstIndex + 2] = data[srcIndex + 2] // B
      croppedData[dstIndex + 3] = data[srcIndex + 3] // A
    }
  }

  return new ImageData(croppedData, croppedWidth, croppedHeight)
}

/**
 * Crops an image on canvas and returns the cropped canvas
 * @param canvas - Source canvas element
 * @param cropAllSides - If true, crops all sides; if false, crops only left/right
 * @returns New canvas with cropped content
 */
export const cropCanvasImage = (canvas: HTMLCanvasElement, cropAllSides = false): HTMLCanvasElement => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const croppedImageData = cropAllSides ? cropImageAllSides(imageData) : cropImageLeftRight(imageData)

  // Create new canvas with cropped dimensions
  const croppedCanvas = document.createElement('canvas')
  croppedCanvas.width = croppedImageData.width
  croppedCanvas.height = croppedImageData.height

  const croppedCtx = croppedCanvas.getContext('2d')
  if (!croppedCtx) return canvas

  croppedCtx.putImageData(croppedImageData, 0, 0)

  return croppedCanvas
}
