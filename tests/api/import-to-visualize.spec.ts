import { test, expect } from '@playwright/test'

// Define the base URL for your API if it is different from the global baseURL
// Or ensure process.env.API_URL is set when running tests
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api/v1'

test.describe('Import To Visualize API', () => {
  test('should create a layer', async ({ request }) => {
    const payload = {
      name: 'E2E Test Create Layer',
      projectId: 'a81bee7a-ecc3-4591-8146-e6a5de5ec5f5', // _My_Image
      layerType: 'PHOTO', // Valid types: GALLERY, VECTOR_TILE, RASTER_TILE, PHOTO, VECTOR, DRAW
      features: [],
    }

    // Note: You might need to handle authentication headers here if your API is protected.
    // Use request.newContext({ extraHTTPHeaders: { 'Authorization': 'Bearer ...' } }) in a beforeAll hook.

    const response = await request.post(`${API_BASE_URL}/import-to-visualize/layer`, {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        // 'x-api-key': process.env.API_KEY || ''
      },
    })

    // Verify the response
    expect(response.ok()).toBeTruthy()
    const responseBody = await response.json()
    expect(responseBody).toHaveProperty('id')
  })

  test('should delete a layer', async ({ request }) => {
    // Ideally, create a layer first to delete, or use a known ID
    const layerIdToDelete = '00000000-0000-0000-0000-000000000000'
    const projectId = '00000000-0000-0000-0000-000000000000'

    const response = await request.delete(`${API_BASE_URL}/import-to-visualize/layer`, {
      params: {
        id: layerIdToDelete,
        projectId: projectId,
      },
      headers: {
        // 'x-api-key': process.env.API_KEY || ''
      },
    })

    // Expect 200 OK or 204 No Content, or 404 if not found (depending on what you want to test)
    // expect(response.ok()).toBeTruthy();
  })
})
