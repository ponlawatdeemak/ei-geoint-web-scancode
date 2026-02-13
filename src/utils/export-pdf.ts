import { captureMapImage } from './capture'
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'

// Configure pdfMake with fonts
pdfMake.vfs = pdfFonts.vfs

export const exportPdf = async ({ dialogDiv, fileName }: { dialogDiv: HTMLDivElement | null; fileName: string }) => {
  if (!dialogDiv) {
    throw new Error('exportPdf failed.')
  }

  const dataURL = await captureMapImage(dialogDiv)

  const a4Width = 841
  const dialogRatio = dialogDiv.clientWidth / dialogDiv.clientHeight
  const pdfPageMargin = 40
  const dialogImageWidth = a4Width - pdfPageMargin * 2

  const docDefinition: any = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    content: [
      {
        image: dataURL,
        width: dialogImageWidth,
        height: dialogImageWidth / dialogRatio,
        alignment: 'center',
        margin: [0, pdfPageMargin / dialogRatio, 0, 0],
      },
    ],
  }

  try {
    // Use download() directly instead of getBlob
    pdfMake.createPdf(docDefinition).download(`${fileName}.pdf`)
  } catch (error) {
    console.error('PDF creation error:', error)
    throw error
  }
}
