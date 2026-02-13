import html2canvas from 'html2canvas'

export const onCapture = () => {
  const timestamp = new Date().toISOString().replaceAll(/[:.-]/g, '_')
  const filename = `screenshot_${timestamp}.png`
  html2canvas(document.body, {
    useCORS: true,
    allowTaint: true,
    scrollX: 0,
    scrollY: 0,
    onclone: (clone) => {
      clone.body.style.height = 'unset'
      const elements = clone.getElementsByClassName('capture')
      for (let index = 0; index < elements.length; index++) {
        const element = elements[index] as HTMLElement
        element.style.overflowY = 'visible !important'
        element.style.maxHeight = 'unset !important'
        element.style.height = 'unset !important'
      }
      return true
    },
  }).then((canvas) => {
    const img = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = img
    link.download = filename
    link.click()
  })
}
