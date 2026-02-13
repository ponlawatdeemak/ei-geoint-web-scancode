'use client'

import ProfileForm from '@/components/form/ProfileForm'
import NavigationBar from '@/components/layout/NavigationBar'

const ProfilePage = () => (
  <div className='flex h-full flex-col'>
    <div className='flex flex-shrink-0'>
      <NavigationBar items={[{ label: 'navigation.profile' }]} />
    </div>
    <div className='flex-1 overflow-hidden'>
      <ProfileForm />
    </div>
  </div>
)
export default ProfilePage
