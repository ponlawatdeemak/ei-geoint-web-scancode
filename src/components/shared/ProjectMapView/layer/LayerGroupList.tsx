import React, { useEffect, useMemo, useState } from 'react'
import {
  GetModelAllDtoOut,
  MapType,
  ProjectMapViewGroup,
  ProjectMapViewPageLevel,
  SARChangeDetectionKey,
} from '@interfaces/index'
import Checkbox from '@mui/material/Checkbox'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import { withAlpha } from '@/utils/color'
import { ArrowForwardIosSharp } from '@mui/icons-material'
import BorderAllIcon from '@mui/icons-material/BorderAll'
import { useTranslation } from 'react-i18next'
import Empty from '@/components/common/empty'
import LayerIcon from './LayerIcon'
import LayerMenu from './LayerMenu'
import { Typography } from '@mui/material'
import { ItvMenuItem } from '../utils/importToVisualize'
import { DnDIcon } from '@/icons'
import { Droppable, Draggable } from '@hello-pangea/dnd'

// Function to get display name of a layer
const getLayerDisplayName = (
  layer: ProjectMapViewGroup['layers'][number],
  findModelByKeyOrName: ((k: string) => GetModelAllDtoOut | undefined) | undefined,
  t: (key: string) => string,
  i18n: { language?: string },
) => {
  if (layer.type === MapType.geojson) return t('map.aoiLayer')
  const mdl = findModelByKeyOrName?.(layer.key)
  if (!mdl) return layer.label
  const isTh = typeof i18n?.language === 'string' && i18n.language.startsWith('th')
  return isTh ? (mdl.name ?? mdl.nameEn ?? layer.label) : (mdl.nameEn ?? mdl.name ?? layer.label)
}

// Component to render layer type icon
type LayerTypeIconProps = { layer: ProjectMapViewGroup['layers'][number] }
const LayerTypeIcon: React.FC<LayerTypeIconProps> = ({ layer }) => {
  if (layer.type === MapType.vector || layer.type === MapType.geojson) {
    return (
      <span
        className={`inline-block h-3.5 min-h-3.5 w-3.5 min-w-3.5 shrink-0 align-middle ${
          layer.key === SARChangeDetectionKey ? 'rounded-full' : 'rounded-[3px]'
        }`}
        style={{ background: withAlpha(layer.color, 0.5), border: `1px solid ${layer.color}` }}
      />
    )
  }
  return (
    <span className='inline-flex h-3.5 min-h-3.5 w-3.5 min-w-3.5 shrink-0 items-center justify-center rounded-[3px] align-middle text-(--color-text-icon)'>
      <BorderAllIcon fontSize='small' />
    </span>
  )
}

type Props = {
  groups: ProjectMapViewGroup[]
  pageLevel: ProjectMapViewPageLevel
  layerVisibility: Record<string, boolean>
  onToggle: (id: string, isVisible: boolean) => void
  onOpenGroup: (group: ProjectMapViewGroup) => void
  onDownloadGroup: (groupId: string) => void
  findModelByKeyOrName?: (k: string) => GetModelAllDtoOut | undefined
  isPanelOpen: boolean
  onMenuSelect: (item: ItvMenuItem, group: ProjectMapViewGroup) => void
  isReordering?: boolean
  onReorder?: (groups: ProjectMapViewGroup[]) => void
}

const LayerGroupList: React.FC<Props> = ({
  groups,
  pageLevel,
  layerVisibility,
  onToggle,
  onOpenGroup,
  onDownloadGroup,
  findModelByKeyOrName,
  isPanelOpen,
  onMenuSelect,
  isReordering,
}) => {
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const { t, i18n } = useTranslation('common')

  // default open for all groups
  useEffect(() => {
    const next: Record<string, boolean> = {}
    for (const g of groups) next[g.groupId] = true
    setOpen(next)
  }, [groups])

  useEffect(() => {
    if (!isPanelOpen) {
      setSelectedGroup(null)
    }
  }, [isPanelOpen])

  const isEmptyGroup = useMemo(() => {
    return groups.length === 0
  }, [groups])

  return (
    <div>
      {isEmptyGroup ? (
        <div className='lg:h-[calc(100%-96px-17px)]'>
          <Empty className='mt-8' message={t('empty.noData')} />
        </div>
      ) : (
        <Droppable droppableId='layer-group-list'>
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {groups.map((group, index) => {
                const isOpen = !!open[group.groupId]
                const isTaskLayer = !!group.taskId

                return (
                  <Draggable
                    key={group.groupId}
                    draggableId={group.groupId}
                    index={index}
                    isDragDisabled={!isReordering}
                  >
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.draggableProps} className='mb-1'>
                        <Accordion
                          expanded={isOpen}
                          onChange={(e) => {
                            if (!isReordering) {
                              e.stopPropagation()
                              setSelectedGroup(group.groupId)
                              onOpenGroup(group)
                            }
                          }}
                          disableGutters
                          elevation={snapshot.isDragging ? 2 : 0}
                          className={`rounded border border-(--color-gray-border) ${snapshot.isDragging ? 'opacity-80' : ''}`}
                          sx={{ '&:before': { display: 'none' } }}
                        >
                          <AccordionSummary
                            component='div'
                            className={`h-12 min-h-6 ${isReordering ? 'px-4' : 'px-2'} pr-1! ${selectedGroup === group.groupId ? 'bg-(--color-background-dark)! text-white' : ''}`}
                          >
                            <div
                              className={`ml-1 flex w-full items-center justify-between ${selectedGroup === group.groupId ? 'text-white' : ''}`}
                            >
                              <div
                                className={`grid w-full ${isReordering ? 'grid-cols-[32px_1fr_40px] gap-4' : 'grid-cols-[1rem_1fr_2.5rem] gap-1'}`}
                              >
                                <div className='flex items-center'>
                                  {isReordering ? (
                                    <div
                                      {...provided.dragHandleProps}
                                      className='flex h-8 w-8 cursor-grab items-center justify-center text-(--color-text-icon)'
                                    >
                                      <DnDIcon color='primary' fontSize='small' className='h-[18px] w-[18px]' />
                                    </div>
                                  ) : (
                                    isTaskLayer && (
                                      <button
                                        type='button'
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setOpen((prev) => ({ ...prev, [group.groupId]: !prev[group.groupId] }))
                                        }}
                                        aria-expanded={isOpen}
                                        className={`inline-flex h-[16px] w-[16px] shrink-0 transform cursor-pointer items-center justify-center p-1 transition-transform ${isOpen ? 'rotate-90' : 'rotate-0'} ${selectedGroup === group.groupId ? 'text-white' : 'text-(--color-text-icon)'}`}
                                      >
                                        <ArrowForwardIosSharp fontSize='small' className='h-[8px] w-[8px]' />
                                      </button>
                                    )
                                  )}
                                </div>
                                <div className='flex min-w-0 items-center gap-2'>
                                  <div className='flex shrink-0 items-center gap-2'>
                                    {!isReordering && (
                                      <Checkbox
                                        className={`px-0! py-0!`}
                                        size='small'
                                        disabled={!group.layers || group.layers.length === 0}
                                        checked={group.layers.every((l) => !!layerVisibility[l.id])}
                                        indeterminate={
                                          group.layers.some((l) => !!layerVisibility[l.id]) &&
                                          !group.layers.every((l) => !!layerVisibility[l.id])
                                        }
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                          e.stopPropagation()
                                          const checked = e.target.checked
                                          for (const l of group.layers) {
                                            onToggle(l.id, checked)
                                          }
                                        }}
                                        sx={{ input: { ariaLabel: `toggle-group-${group.groupId}` } }}
                                      />
                                    )}
                                    <LayerIcon group={group} selectedGroup={selectedGroup} />
                                  </div>
                                  <Typography noWrap>{group.groupName}</Typography>
                                </div>
                                {!isReordering && (
                                  <LayerMenu
                                    group={group}
                                    selectedGroup={selectedGroup}
                                    pageLevel={pageLevel}
                                    onDownloadGroup={onDownloadGroup}
                                    onMenuSelect={onMenuSelect}
                                  />
                                )}
                              </div>
                            </div>
                          </AccordionSummary>
                          {isTaskLayer && !isReordering && (
                            <AccordionDetails className='pt-0 pb-0 pl-2'>
                              {group.layers.map((layer) => (
                                <div key={layer.id} className='flex min-w-0 items-center'>
                                  <div className='flex items-center gap-0'>
                                    <Checkbox
                                      size='small'
                                      checked={!!layerVisibility[layer.id]}
                                      onChange={(event) => onToggle(layer.id, event.target.checked)}
                                      id={layer.id}
                                    />
                                    <LayerTypeIcon layer={layer} />
                                  </div>
                                  <label
                                    htmlFor={layer.id}
                                    className='wrap-break-word ml-2 min-w-0 flex-1 py-2 text-sm'
                                  >
                                    {getLayerDisplayName(layer, findModelByKeyOrName, t, i18n)}
                                  </label>
                                </div>
                              ))}
                            </AccordionDetails>
                          )}
                        </Accordion>
                      </div>
                    )}
                  </Draggable>
                )
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      )}
    </div>
  )
}

export default LayerGroupList
