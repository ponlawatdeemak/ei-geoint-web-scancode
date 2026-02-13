const jsonToCsv = (jsonData: any[]) => {
  let csv = ''
  // Get the headers
  const headers = Object.keys(jsonData[0])
  csv += headers.join(',') + '\n'
  // Add the data
  jsonData.forEach(function (row: any) {
    const data = headers.map((header) => JSON.stringify(row[header])).join(',') // Add JSON.stringify statement
    csv += data + '\n'
  })
  return csv
}

export const onExportCSV = (jsonData: any) => {
  const csvData = jsonToCsv(jsonData)

  const blob = new Blob([csvData], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = 'data.csv'
  document.body.appendChild(link)
  link.click()

  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}
