import NavigationBar from '@/components/layout/NavigationBar'
import EditSubscriptionForm from '@/components/form/EditSubscriptionForm'

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  return (
    <div className='flex h-full flex-col'>
      <div className='flex flex-shrink-0'>
        <NavigationBar
          items={[
            { label: 'navigation.manageSubscription', href: '/subscription' },
            { label: id === 'create' ? 'navigation.addSubscription' : 'navigation.editSubscription' },
          ]}
        />
      </div>
      <div className='flex-1 overflow-hidden'>
        <EditSubscriptionForm subscriptionId={id === 'create' ? undefined : id} />
      </div>
    </div>
  )
}
export default Page
