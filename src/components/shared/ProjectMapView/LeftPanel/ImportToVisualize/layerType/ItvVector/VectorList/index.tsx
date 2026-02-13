import { FC, useMemo } from 'react'
import VectorItem from './VectorItem'
import Empty from '@/components/common/empty'
import { useTranslation } from 'react-i18next'
import { List } from '@mui/material'
import { ItvFeatureProperties } from '@interfaces/entities'

interface Props {
  features: ItvFeatureProperties[]
  onDelete: (value: string) => void
  projectId: string
}
const VectorList: FC<Props> = ({ features, onDelete, projectId }) => {
  const { t } = useTranslation('common')

  const vectorList: ItvFeatureProperties[] = useMemo(() => {
    return features.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      return 0
    })
  }, [features])
  return (
    <div className='flex flex-col gap-2'>
      {features.length === 0 ? (
        <Empty message={t('empty.noList')} />
      ) : (
        <div className='h-[calc(100vh-510px)] overflow-auto sm:h-[calc(100vh-550px)] md:h-[calc(100vh-540px)]'>
          <List sx={{ p: 0, gap: 2 }}>
            {vectorList.map((row, i) => {
              return <VectorItem key={i} feature={row} onDelete={onDelete} projectId={projectId} />
            })}
          </List>
        </div>
      )}
    </div>
  )
}

export default VectorList
