import NavigationBar from '@/components/layout/NavigationBar'
import EditUserForm from '@/components/form/EditUserForm'

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  return (
    <div className='flex h-full flex-col'>
      <div className='flex flex-shrink-0'>
        <NavigationBar
          items={[
            { label: 'navigation.manageUser', href: '/user' },
            { label: id === 'create' ? 'navigation.addUser' : 'navigation.editUser' },
          ]}
        />
      </div>
      <div className='flex-1 overflow-hidden'>
        <EditUserForm userId={id === 'create' ? undefined : id} />
      </div>
    </div>
  )
}
export default Page
