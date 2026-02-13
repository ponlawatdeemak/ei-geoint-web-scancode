import { SearchImagesDtoOut } from '@interfaces/dto/images'
import { ImagesMode, ViewType } from '../images'
import ResultTable from './ResultTable'
import ResultCard from './ResultCard'
import { useTranslation } from 'react-i18next'
import Empty from '../../empty'
import { useMemo } from 'react'

type Props = {
  viewType: ViewType
  data: SearchImagesDtoOut | undefined
  mode: ImagesMode
  currentPage?: number
  onPageChange?: (page: number) => void
  pageUse: 'gallery' | 'task' | 'itv'
}

const ResultPanel = ({ viewType, data, mode, currentPage = 1, onPageChange, pageUse }: Props) => {
  const { t } = useTranslation('common')

  return (
    <div className='lg:h-[calc(100%-96px-17px)]'>
      {data && data?.data?.length > 0 ? (
        viewType === ViewType.GRID ? (
          <ResultCard data={data} currentPage={currentPage} onPageChange={onPageChange} pageUse={pageUse} />
        ) : (
          <ResultTable data={data} currentPage={currentPage} onPageChange={onPageChange} pageUse={pageUse} />
        )
      ) : (
        <Empty className='mt-8' message={t('empty.noImageSearch')} />
      )}
    </div>
  )
}
export default ResultPanel
