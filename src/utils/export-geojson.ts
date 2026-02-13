export const onExportGeoJSON = (geoJSONData: any) => {
  const geojsonString = JSON.stringify(geoJSONData, null, 2)

  const blob = new Blob([geojsonString], { type: 'application/json' })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'data.geojson'
  document.body.appendChild(link)
  link.click()

  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}
