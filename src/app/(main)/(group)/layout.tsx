import Sidebar from '@/components/layout/Sidebar'

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className='flex h-full w-full bg-gradient-to-b from-[#004080] to-[#0C2E50]'>
      <div className='hidden flex-shrink-0 md:flex'>
        <Sidebar />
      </div>
      <div className='flex-1 overflow-hidden bg-white md:rounded-tl-3xl'>{children}</div>
    </div>
  )
}
export default Layout
