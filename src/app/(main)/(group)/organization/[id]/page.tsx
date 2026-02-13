import NavigationBar from '@/components/layout/NavigationBar'
import EditOrganizationForm from '@/components/form/EditOrganizationForm'

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  return (
    <div className='flex h-full flex-col'>
      <div className='flex flex-shrink-0'>
        <NavigationBar
          items={[
            { label: 'navigation.manageOrganization', href: '/organization' },
            { label: id === 'create' ? 'navigation.addOrganization' : 'navigation.editOrganization' },
          ]}
        />
      </div>
      <div className='flex-1 overflow-hidden'>
        <EditOrganizationForm organizationId={id === 'create' ? undefined : id} />
      </div>
    </div>
  )
}
export default Page
