import { useState, useEffect, useRef } from 'react'
import { Box } from '@mui/material'
import SearchForm from './SearchForm'
import SearchResult from './SearchResult'
import NoDataPlaceholder from './NoDataPlaceholder'
import SelectAreaForm from './SelectAreaForm'
import SelectModelForm from './SelectModelForm'
import { useWeeklyMapStore } from './store/useWeeklyMapStore'
import { TaskLayer } from '@interfaces/index'
import { useTranslation } from 'react-i18next'

type View = 'main' | 'select-area' | 'select-model'

type SearchContainerProps = {
  onSelected?: (data: TaskLayer[]) => void
}

// --- SearchContainer Component ---
const SearchContainer: React.FC<SearchContainerProps> = ({ onSelected }) => {
  const { data, loading, selectedData } = useWeeklyMapStore()
  const { t } = useTranslation('common')
  const [currentView, setCurrentView] = useState<View>('main')

  // ป้องกัน loop การยิง onSelected ด้วย useRef
  const lastSelectedRef = useRef<typeof selectedData | null>(null)
  useEffect(() => {
    if (selectedData && lastSelectedRef.current !== selectedData) {
      lastSelectedRef.current = selectedData
      onSelected?.(selectedData.layer)
    }
  }, [selectedData, onSelected])

  const handleSelectAreaClick = () => {
    setCurrentView('select-area')
  }

  const handleSelectModelClick = () => {
    setCurrentView('select-model')
  }

  return (
    <Box p={0} className='flex h-full min-h-0 flex-col'>
      {currentView === 'select-area' && (
        <SelectAreaForm
          onBack={() => {
            setCurrentView('main')
          }}
        />
      )}
      {currentView === 'select-model' && (
        <SelectModelForm
          onBack={() => {
            setCurrentView('main')
          }}
        />
      )}
      {currentView === 'main' && (
        <>
          <SearchForm onSelectAreaClick={handleSelectAreaClick} onSelectModelClick={handleSelectModelClick} />
          {!loading && data.length === 0 ? (
            <NoDataPlaceholder text={t('table.noData')} />
          ) : (
            <SearchResult onSelected={onSelected} />
          )}
        </>
      )}
    </Box>
  )
}

export default SearchContainer
