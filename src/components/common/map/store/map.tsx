import { create } from 'zustand'
import maplibregl from 'maplibre-gl'
import { BasemapType } from '../config/map'

export type MapStore = {
  mapLibre: Record<string, maplibregl.Map | null>
  setMapLibre: (id: string, value: maplibregl.Map | null) => void

  basemap: BasemapType
  setBasemap: (basemap: BasemapType) => void

  // style-data handlers registry so components can re-create layers after style reload
  // Keep handlers scoped per map instance to avoid cross-map side effects
  styleDataHandlers: Map<maplibregl.Map, Record<string, (map: maplibregl.Map) => void>>
  registerStyleDataHandler: (map: maplibregl.Map, id: string, handler: (map: maplibregl.Map) => void) => void
  unregisterStyleDataHandler: (map: maplibregl.Map, id: string) => void
  callStyleDataHandlers: (map: maplibregl.Map) => void
}

export const useMapStore = create<MapStore>()((set, get) => ({
  mapLibre: {},
  setMapLibre: (id, value) => set((state) => ({ ...state, mapLibre: { ...state.mapLibre, [id]: value } })),

  basemap: BasemapType.GoogleSatellite,
  setBasemap: (basemap) => set({ basemap }),

  styleDataHandlers: new Map(),
  registerStyleDataHandler: (map, id, handler) =>
    set((state) => {
      const next = new Map(state.styleDataHandlers)
      const handlers = { ...(next.get(map) || {}), [id]: handler }
      next.set(map, handlers)
      return { styleDataHandlers: next }
    }),
  unregisterStyleDataHandler: (map, id) =>
    set((state) => {
      const next = new Map(state.styleDataHandlers)
      const handlers = { ...(next.get(map) || {}) }
      delete handlers[id]
      if (Object.keys(handlers).length === 0) {
        next.delete(map)
      } else {
        next.set(map, handlers)
      }
      return { styleDataHandlers: next }
    }),
  callStyleDataHandlers: (map) => {
    const handlers = get().styleDataHandlers.get(map)
    if (!handlers) return
    Object.values(handlers).forEach((h) => {
      try {
        h(map)
      } catch (e) {
        // swallow handler errors to avoid breaking style load
        // eslint-disable-next-line no-console
        console.error('styleDataHandler error', e)
      }
    })
  },
}))

export default useMapStore
