'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/hook/useSettings'
import { useProfileStore } from '@/hook/useProfileStore'
import service from '@/api'
import { GetOrganizationDtoOut, GetUsersDataManagementDtoOut, Roles } from '@interfaces/index'
import { ArcElement, Chart as ChartJS, Tooltip } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount'
import PersonIcon from '@mui/icons-material/Person'
import PersonSearchIcon from '@mui/icons-material/PersonSearch'
ChartJS.register(ArcElement, Tooltip)

interface OrganizationHeaderProps {
  organizationId: string
}

const OrganizationHeader = ({ organizationId }: OrganizationHeaderProps) => {
  const { t } = useTranslation('common')
  const { language } = useSettings()
  const profile = useProfileStore((state) => state.profile)

  const isAdminOrSuperAdmin = useMemo(() => {
    return profile && [Roles.superAdmin, Roles.admin].includes(profile.roleId)
  }, [profile])

  const { data: orgData } = useQuery<GetOrganizationDtoOut>({
    queryKey: ['organization', organizationId],
    queryFn: () => service.organizations.get(organizationId),
    enabled: !!organizationId,
  })

  const { data: usersData = [] } = useQuery<GetUsersDataManagementDtoOut[]>({
    queryKey: ['data-management-users', organizationId],
    queryFn: () =>
      service.dataManagement.getUsers(isAdminOrSuperAdmin && organizationId ? { organizationId } : undefined),
    enabled: !!profile,
  })

  const organizationName = useMemo(() => {
    if (!orgData) return '-'
    return language === 'th' ? orgData.name : orgData.nameEn
  }, [orgData, language])

  // จับคู่ข้อมูลผู้ใช้ตามประเภทบทบาท
  const customerAdminData = usersData.find((u) => u.type === Roles.customerAdmin)
  const userData = usersData.find((u) => u.type === Roles.user)
  const viewerData = usersData.find((u) => u.type === Roles.viewer)

  return (
    <div className='rounded-lg bg-white p-4'>
      {/* ชื่อหน่วยงาน */}
      <div className='mb-6 flex items-center justify-center'>
        <h1 className='font-semibold text-2xl'>{organizationName}</h1>
      </div>

      {/* ส่วนจำนวนผู้ใช้งาน */}
      <div className='mb-2'>
        <h2 className='mb-4 font-semibold text-md'>{t('dataManagement.userCount')}</h2>
        <div className='grid grid-cols-3 gap-2 md:flex md:flex-wrap md:justify-center md:gap-4'>
          <UserCountCard
            icon={<SupervisorAccountIcon />}
            label={t('dataManagement.customerAdmin')}
            count={customerAdminData?.count ?? 0}
            limit={customerAdminData?.limit ?? 0}
            percent={customerAdminData?.percent ?? 0}
          />
          <UserCountCard
            icon={<PersonIcon />}
            label={t('dataManagement.user')}
            count={userData?.count ?? 0}
            limit={userData?.limit ?? 0}
            percent={userData?.percent ?? 0}
          />
          <UserCountCard
            icon={<PersonSearchIcon />}
            label={t('dataManagement.viewer')}
            count={viewerData?.count ?? 0}
            limit={viewerData?.limit ?? 0}
            percent={viewerData?.percent ?? 0}
          />
        </div>
      </div>
    </div>
  )
}

interface UserCountCardProps {
  icon: React.ReactNode
  label: string
  count: number
  limit: number
  percent: number
}

const UserCountCard = ({ icon, label, count, limit, percent }: UserCountCardProps) => {
  const { t } = useTranslation('common')
  const isUnlimited = limit === 0

  return (
    <div className='flex flex-col items-start gap-1 rounded-lg border border-[#D9DAD9] bg-white px-2 py-3 shadow-sm md:min-w-[298px] md:flex-row md:items-center md:gap-4 md:px-4'>
      {/* Icon and Label */}
      <div className='flex flex-col items-start'>
        {icon}
        <span className='mt-1 font-semibold text-xs md:text-xl'>{label}</span>
      </div>

      {/* chart */}
      <div className='relative h-16 w-16 self-center md:ml-auto md:h-18 md:w-18'>
        <Doughnut
          data={{
            datasets: [
              {
                data: isUnlimited ? [100, 0] : [percent, 100 - percent],
                backgroundColor: ['#0E94FA', '#e5e7eb'],
                borderWidth: 0,
              },
            ],
          }}
          options={{
            cutout: '85%',
            plugins: {
              tooltip: { enabled: false },
              legend: { display: false },
            },
          }}
        />
        <div className='absolute inset-0 flex flex-col items-center justify-center'>
          {isUnlimited ? (
            <>
              <span className='font-bold text-sm md:text-lg'>{count}</span>
              <span className='text-[#4F524F] text-[0.5rem] md:text-[0.625rem]'>{t('dataManagement.unlimited')}</span>
            </>
          ) : (
            <>
              <span className='font-bold text-xs md:text-sm'>{percent}%</span>
              <span className='text-[#4F524F] text-[0.5rem] md:text-[0.625rem]'>
                {count}/{limit}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default OrganizationHeader
