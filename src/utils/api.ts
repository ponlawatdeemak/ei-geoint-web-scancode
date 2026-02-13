export const getQueryParams = (payload: { [key: string]: any }) => {
  const query = Object.keys(payload)
    .filter((key) => !!payload[key])
    .map((key) => `${key}=${payload[key]}`)
    .join('&')
  return query
}
