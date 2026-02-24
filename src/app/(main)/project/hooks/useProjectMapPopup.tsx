import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Roles } from '@interfaces/config'
import type { SearchProjectResultItem } from '@interfaces/index'
import { MAP_ID } from '../page'
import { ProjectInfoWindow } from '../components/ProjectInfoWindow'
import { useMapStore } from '@/components/common/map/store/map'
import type { UserProfile } from '@/hook/useProfileStore'

interface UseProjectMapPopupProps {
  isMobile: boolean
  selectedProject: SearchProjectResultItem | null
  popupCoordinates: [number, number] | null
  setSelectedProject: (project: SearchProjectResultItem | null) => void
  setPopupCoordinates: (coords: [number, number] | null) => void
  profile: UserProfile | null
  handleDelete: (project: SearchProjectResultItem, onComplete?: () => void) => void
  canDelete: boolean
}

export const useProjectMapPopup = ({
  isMobile,
  selectedProject,
  popupCoordinates,
  setSelectedProject,
  setPopupCoordinates,
  profile,
  handleDelete,
  canDelete,
}: UseProjectMapPopupProps) => {
  const router = useRouter()
  const { mapLibre } = useMapStore()

  useEffect(() => {
    const map = mapLibre[MAP_ID]
    if (!map || !selectedProject || !popupCoordinates) return

    // On mobile, don't create popup - will use Dialog instead
    if (isMobile) return

    let cleanup: (() => void) | null = null

    // Prepare handlers outside to reduce nesting
    const isOwner = selectedProject.createdByUser?.id === profile?.id
    const canEdit =
      [Roles.superAdmin, Roles.admin, Roles.customerAdmin].includes(profile?.roleId ?? -1) ||
      (profile?.roleId === Roles.user && isOwner)

    const handleEdit = canEdit
      ? () => {
          router.push(`/project/${selectedProject.id}`)
        }
      : undefined

    const handleClose = () => {
      setSelectedProject(null)
      setPopupCoordinates(null)
    }

    const handleDeleteAction = canDelete
      ? () => {
          handleDelete(selectedProject, () => {
            handleClose()
          })
        }
      : undefined

    const handleView = () => {
      router.push(`/project/${selectedProject.id}`)
    }

    const handleOpenMap = () => {
      router.push(`/project/${selectedProject.id}/task?view=map`)
    }

    const loadPopup = async () => {
      try {
        const maplibregl = await import('maplibre-gl')
        const popupContent = document.createElement('div')

        const [{ createRoot }, { ThemeProvider }, themeModule, { I18nextProvider }, i18nextModule] = await Promise.all([
          import('react-dom/client'),
          import('@mui/material/styles'),
          import('@/styles/theme'),
          import('react-i18next'),
          import('@/i18n/i18next'),
        ])

        const root = createRoot(popupContent)
        const theme = themeModule.default
        const i18n = i18nextModule.default

        root.render(
          <ThemeProvider theme={theme}>
            <I18nextProvider i18n={i18n}>
              <ProjectInfoWindow
                project={selectedProject}
                onClose={handleClose}
                onEdit={handleEdit}
                onView={handleView}
                onDelete={handleDeleteAction}
                onOpenMap={handleOpenMap}
              />
            </I18nextProvider>
          </ThemeProvider>,
        )

        const popup = new maplibregl.default.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 32,
          maxWidth: '1200px',
        })
          .setLngLat(popupCoordinates)
          .setDOMContent(popupContent)
          .addTo(map)

        cleanup = () => {
          popup.remove()
          if (root) root.unmount()
        }
      } catch (error) {
        console.error('Failed to load popup dependencies', error)
      }
    }

    loadPopup()

    return () => {
      if (cleanup) cleanup()
    }
  }, [
    mapLibre,
    selectedProject,
    popupCoordinates,
    router,
    handleDelete,
    isMobile,
    canDelete,
    profile?.id,
    profile?.roleId,
    setSelectedProject,
    setPopupCoordinates,
  ])
}
