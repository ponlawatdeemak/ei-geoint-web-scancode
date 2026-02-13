'use client'

import LandingWeekly from './components/LandingWeekly'
import NavigationBar from '@/components/layout/NavigationBar'

export default function Page() {
  return (
    <div className='flex h-full flex-col'>
      <div className='flex h-full flex-col'>
        <div className='flex shrink-0'>
          <NavigationBar
            backOnly
            items={[
              { label: 'menu.project', href: '/project' },
              { label: 'map.weekly', href: '/project' },
            ]}
          />
        </div>
        <div className='flex-1 overflow-hidden'>
          <div className='flex h-full w-full bg-(--color-background-default) pt-4'>
            <LandingWeekly />
          </div>
        </div>
      </div>
    </div>
  )
}
