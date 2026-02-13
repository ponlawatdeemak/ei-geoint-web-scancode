'use client'

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UsedStorageData } from '@/api/data-management'
import { bytesToTB } from '@/utils/convert'
import { ArcElement, Chart as ChartJS, Tooltip } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import { FormControl, MenuItem, Select, SelectChangeEvent } from '@mui/material'

ChartJS.register(ArcElement, Tooltip)

type FilterType = 'all' | 'gallery' | 'project'

interface StorageUsageChartProps {
  usedStorage?: UsedStorageData
}

const StorageUsageChart = ({ usedStorage }: StorageUsageChartProps) => {
  const { t } = useTranslation('common')
  const [filter, setFilter] = useState<FilterType>('all')

  const handleFilterChange = (event: SelectChangeEvent) => {
    setFilter(event.target.value as FilterType)
  }

  // คำนวณค่าตาม filter ที่เลือก
  const chartData = useMemo(() => {
    if (!usedStorage) {
      return { organizationUsed: 0, ownerUsed: 0, othersUsed: 0, remaining: 0, limit: 0, percent: 0, isUnlimited: true }
    }

    const { organization, owner } = usedStorage
    const limit = organization.limit // limit เป็น TB อยู่แล้ว
    const isUnlimited = limit === 0

    let orgValueBytes = 0
    let ownerValueBytes = 0

    if (filter === 'gallery') {
      orgValueBytes = organization.gallery
      ownerValueBytes = owner.gallery
    } else if (filter === 'project') {
      orgValueBytes = organization.project
      ownerValueBytes = owner.project
    } else {
      orgValueBytes = organization.total
      ownerValueBytes = owner.total
    }

    // แปลง bytes เป็น TB
    const orgValueTB = bytesToTB(orgValueBytes)
    const ownerValueTB = bytesToTB(ownerValueBytes)

    // กรณีไม่มีข้อมูล organization แต่มีข้อมูล owner (เช่น user ดูข้อมูลตัวเอง)
    // ใช้ค่า owner เป็นค่าแสดงผลโดยตรง ไม่ต้องลบ
    const isOwnerOnly = orgValueBytes === 0 && ownerValueBytes > 0
    if (isOwnerOnly) {
      return {
        organizationUsed: ownerValueTB,
        ownerUsed: ownerValueTB,
        othersUsed: 0,
        remaining: 0,
        limit: ownerValueTB || 1,
        percent: 100,
        isUnlimited: true,
      }
    }

    const othersUsedTB = bytesToTB(Math.max(0, orgValueBytes - ownerValueBytes))
    const totalUsedTB = orgValueTB

    if (isUnlimited) {
      // กรณีไม่มี limit: ซ่อน "คงเหลือ", org แสดงเต็ม, owner แสดง org - owner
      return {
        organizationUsed: orgValueTB,
        ownerUsed: ownerValueTB,
        othersUsed: othersUsedTB,
        remaining: 0,
        limit: orgValueTB || 1, // ใช้ org total เป็น reference สำหรับ chart
        percent: 100,
        isUnlimited: true,
      }
    }

    // กรณีมี limit: แสดง "คงเหลือ"
    const remaining = Math.max(0, limit - totalUsedTB)
    const percent = limit > 0 ? Math.round((totalUsedTB / limit) * 100) : 0

    return {
      organizationUsed: orgValueTB,
      ownerUsed: ownerValueTB,
      othersUsed: othersUsedTB,
      remaining,
      limit,
      percent,
      isUnlimited: false,
    }
  }, [usedStorage, filter])

  // Labels สำหรับ tooltip
  const labels = useMemo(
    () => ({
      organization: t('dataManagement.organization'),
      owner: t('dataManagement.owner'),
      free: t('dataManagement.free'),
    }),
    [t],
  )

  // Chart data configuration
  const doughnutData = useMemo(() => {
    if (chartData.isUnlimited) {
      // กรณีไม่มี limit: แสดง org เต็ม และ owner (org - owner = others)
      return {
        labels: [labels.organization, labels.free, labels.owner, labels.free],
        datasets: [
          {
            label: labels.organization,
            data: [chartData.organizationUsed, 0],
            backgroundColor: ['#0E94FA', '#e5e7eb'],
            borderWidth: 0,
            circumference: 180,
            rotation: 270,
          },
          {
            label: labels.owner,
            data: [chartData.ownerUsed, chartData.othersUsed || 0.001],
            backgroundColor: ['#56B4FB', '#e5e7eb'],
            borderWidth: 0,
            circumference: 180,
            rotation: 270,
          },
        ],
      }
    }

    // กรณีมี limit
    return {
      labels: [labels.organization, labels.free, labels.owner, labels.free],
      datasets: [
        {
          label: labels.organization,
          data: [chartData.organizationUsed, chartData.remaining],
          backgroundColor: ['#0E94FA', '#e5e7eb'],
          borderWidth: 0,
          circumference: 180,
          rotation: 270,
        },
        {
          label: labels.owner,
          data: [chartData.ownerUsed, Math.max(0, chartData.limit - chartData.ownerUsed)],
          backgroundColor: ['#56B4FB', '#e5e7eb'],
          borderWidth: 0,
          circumference: 180,
          rotation: 270,
        },
      ],
    }
  }, [chartData, labels])

  return (
    <div className='rounded-lg bg-white p-4'>
      <div className='mb-4 flex items-center justify-between'>
        <h2 className='font-semibold text-md'>{t('dataManagement.storageUsage')}</h2>
        <FormControl size='small' sx={{ minWidth: { xs: 'auto', sm: 240 } }}>
          <Select value={filter} onChange={handleFilterChange} displayEmpty sx={{ fontSize: '0.875rem' }}>
            <MenuItem value='all'>{t('dataManagement.filterAll')}</MenuItem>
            <MenuItem value='gallery'>{t('dataManagement.filterGallery')}</MenuItem>
            <MenuItem value='project'>{t('dataManagement.filterProject')}</MenuItem>
          </Select>
        </FormControl>
      </div>

      <div className='flex flex-col items-center'>
        {/* Gauge Chart */}
        <div className='relative h-40 w-full max-w-md'>
          <Doughnut
            data={doughnutData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              cutout: '70%',
              interaction: {
                mode: 'nearest',
                intersect: true,
              },
              plugins: {
                legend: { display: false },
                tooltip: {
                  enabled: true,
                  position: 'average',
                  yAlign: 'bottom',
                  xAlign: 'center',
                  displayColors: false,
                  padding: 12,
                  callbacks: {
                    title: () => '',
                    label: (context) => {
                      const datasetLabel = context.dataset.label || ''
                      const value = context.raw as number
                      const dataIndex = context.dataIndex
                      // dataIndex 0 = usage, dataIndex 1 = remaining/free
                      if (dataIndex === 0) {
                        return `${datasetLabel}: ${value.toFixed(2)} TB`
                      }
                      return `${labels.free}: ${value.toFixed(2)} TB`
                    },
                  },
                },
              },
            }}
          />
          <div className='pointer-events-none absolute inset-0 flex items-center justify-center pb-2'>
            {chartData.isUnlimited ? (
              <span className='font-bold text-2xl'>{chartData.organizationUsed.toFixed(2)} TB</span>
            ) : (
              <span className='font-bold text-2xl'>{chartData.percent}%</span>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className='mt-4 flex flex-wrap items-center justify-center gap-6'>
          <div className='flex flex-col text-sm'>
            <div className='flex items-center gap-2'>
              <span className='h-3 w-3 rounded-full bg-[#0E94FA]' />
              <span className='font-semibold text-lg'>{chartData.organizationUsed.toFixed(2)} TB</span>
            </div>
            <span className='ml-5 text-[#818481]'>{t('dataManagement.organization')}</span>
          </div>
          <div className='flex flex-col text-sm'>
            <div className='flex items-center gap-2'>
              <span className='h-3 w-3 rounded-full bg-[#56B4FB]' />
              <span className='font-semibold text-lg'>{chartData.ownerUsed.toFixed(2)} TB</span>
            </div>
            <span className='ml-5 text-[#818481]'>{t('dataManagement.owner')}</span>
          </div>
          {!chartData.isUnlimited && (
            <>
              <div className='h-10 w-px bg-[#E0E0E0]' />
              <div className='flex flex-col text-sm'>
                <div className='flex items-center gap-2'>
                  <span className='h-3 w-3 rounded-full bg-[#e5e7eb]' />
                  <span className='font-semibold text-lg'>{chartData.remaining.toFixed(2)} TB</span>
                </div>
                <span className='ml-5 text-[#818481]'>{t('dataManagement.free')}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default StorageUsageChart
