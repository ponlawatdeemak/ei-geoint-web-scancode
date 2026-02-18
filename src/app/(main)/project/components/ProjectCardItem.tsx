import { Button, ButtonBase, Chip, Tooltip } from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { statusColor } from '../page'
import { Language } from '@interfaces/config'
import type { SearchProjectResultItem } from '@interfaces/index'
import { formatDateTime } from '@/utils/formatDate'

interface ProjectCardItemProps {
  row: SearchProjectResultItem & { thumbnail?: string | null }
  language: Language
  handleMenuOpen: (e: React.MouseEvent<HTMLElement>, row: SearchProjectResultItem) => void
}

export const ProjectCardItem = ({ row, language, handleMenuOpen }: ProjectCardItemProps) => {
  const router = useRouter()
  const { t } = useTranslation('common')

  const formattedCreatedAt = row.createdAt ? formatDateTime(row.createdAt, language) : ''
  const formattedUpdatedAt = row.updatedAt ? formatDateTime(row.updatedAt, language) : ''

  const data = {
    image: row.thumbnail ? `data:image/jpeg;base64,${row.thumbnail}` : '/images/bg_world_map.svg',
    name: row.name,
    detail: row.detail,
    taskItem: row.tasks.length,
    status: row.status && (
      <Chip
        className='text-white!'
        label={language === Language.TH ? row.status.name : row.status.nameEn}
        color={statusColor[Number(row.status.id)]}
        size='small'
      />
    ),
    createdAt: formattedCreatedAt,
    updatedAt: formattedUpdatedAt,
    createdBy: [row.createdByUser?.firstName, row.createdByUser?.lastName].filter(Boolean).join(' '),
  }

  return (
    <div className='flex flex-col overflow-hidden rounded-lg border border-(--color-divider) bg-white shadow-sm'>
      <div className='relative h-56 w-full bg-(--color-divider)'>
        {data.image && <Image className='z-0 object-cover' src={data.image} alt='Image' fill priority />}
        <Tooltip title={t('button.options')} arrow>
          <Button
            className='absolute! top-2 right-2 min-w-0! bg-white! px-1! text-(--color-text-primary)!'
            variant='contained'
            size='small'
            onClick={(e) => handleMenuOpen(e, row)}
          >
            <MoreVertIcon />
          </Button>
        </Tooltip>
      </div>
      <ButtonBase
        className='items-start! flex flex-1 flex-col gap-2 p-4!'
        onClick={() => router.push(`/project/${row.id}/task?view=card`)}
      >
        <Tooltip title={data.name} arrow>
          <div className='line-clamp-2 break-all text-left font-medium'>{data.name}</div>
        </Tooltip>
        <Tooltip title={data.detail} arrow>
          <div className='line-clamp-1 break-all text-left text-(--color-text-secondary) text-sm'>
            {data.detail}
          </div>
        </Tooltip>
        <div className='grid w-full grid-cols-2 items-center gap-2 text-sm md:grid-cols-3 md:pt-4'>
          <div className='flex gap-1'>
            <span className='shrink-0 text-(--color-text-secondary)'>
              {t('form.searchProject.card.task')}:
            </span>
            <span className='font-medium text-(--color-primary)'>
              {t('form.searchProject.card.taskItem', { count: data.taskItem })}
            </span>
          </div>
          <div className='flex items-center gap-1 md:col-span-2'>
            <span className='shrink-0 text-(--color-text-secondary)'>
              {t('form.searchProject.card.status')}:
            </span>
            {data.status}
          </div>
          <div className='flex gap-1'>
            <span className='shrink-0 text-(--color-text-secondary)'>
              {t('form.searchProject.card.createdAt')}:
            </span>
            <Tooltip title={data.createdAt} arrow>
              <span className='truncate'>{data.createdAt}</span>
            </Tooltip>
          </div>
          <div className='flex gap-1'>
            <span className='shrink-0 text-(--color-text-secondary)'>
              {t('form.searchProject.card.updatedAt')}:
            </span>
            <Tooltip title={data.updatedAt} arrow>
              <span className='truncate'>{data.updatedAt}</span>
            </Tooltip>
          </div>
          <div className='flex gap-1'>
            <span className='shrink-0 text-(--color-text-secondary)'>
              {t('form.searchProject.card.createdBy')}:
            </span>
            <Tooltip title={data.createdBy} arrow>
              <span className='truncate'>{data.createdBy}</span>
            </Tooltip>
          </div>
        </div>
      </ButtonBase>
    </div>
  )
}
