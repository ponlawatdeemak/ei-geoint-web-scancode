import { InboxOutlined } from '@mui/icons-material'
import { memo } from 'react'

type Props = {
  message: string
  className?: string
}

const Empty = ({ message, className }: Props) => {
  return (
    <div className={`flex h-full flex-col items-center justify-center ${className || ''}`}>
      <InboxOutlined className='mb-6 text-(--color-gray-border) text-6xl!' />
      <div className='text-[#B3B5B3]'>{message}</div>
    </div>
  )
}

export default memo(Empty)
