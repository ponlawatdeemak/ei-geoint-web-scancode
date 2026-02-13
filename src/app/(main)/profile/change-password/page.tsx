'use client'

import ChangePasswordForm from '@/components/form/ChangePasswordForm'
import NavigationBar from '@/components/layout/NavigationBar'

const ChangePasswordPage = () => (
  <div className='flex h-full flex-col'>
    <div className='flex flex-shrink-0'>
      <NavigationBar
        items={[{ label: 'navigation.profile', href: '/profile' }, { label: 'navigation.changePassword' }]}
      />
    </div>
    <div className='flex-1 overflow-hidden'>
      <ChangePasswordForm />
    </div>
  </div>
)
export default ChangePasswordPage
