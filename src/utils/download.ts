export async function downloadFileItem(href: string) {
  if (!href) return

  const link = document.createElement('a')
  link.href = href
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  await new Promise((resolve) => setTimeout(resolve, 300))
}
