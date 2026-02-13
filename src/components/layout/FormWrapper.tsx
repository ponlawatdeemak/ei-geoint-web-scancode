import React from 'react'

interface FormWrapperProps {
  children: React.ReactNode
  actions: React.ReactNode
  title?: React.ReactNode
  subtitle?: React.ReactNode
  fullWidth?: boolean
  fullHeight?: boolean
  isOpenFromGallery?: boolean
}

const FormWrapper: React.FC<FormWrapperProps> = ({
  children,
  actions,
  title,
  subtitle,
  fullWidth,
  fullHeight,
  isOpenFromGallery = false,
}) => {
  return (
    <div className={`flex h-full w-full flex-col ${isOpenFromGallery ? '' : 'bg-(--color-background-default)'}`}>
      <div
        className={`flex flex-1 justify-center ${isOpenFromGallery ? '' : 'p-4'} ${fullHeight ? 'overflow-y-hidden' : 'overflow-y-auto'}`}
      >
        <div
          className={`w-full self-start rounded-2xl bg-white ${fullWidth ? '' : 'md:max-w-5xl'} ${fullHeight ? 'h-full' : ''}`}
        >
          <div
            className={`m-auto ${isOpenFromGallery ? '' : 'px-4 py-8 md:px-8'} md:max-w-5xl ${fullHeight ? 'h-full' : ''}`}
          >
            {!isOpenFromGallery && (
              <>
                {title && <div className='text-center font-bold text-(--color-text-primary) text-2xl'>{title}</div>}
                {subtitle && <div className='text-center text-(--color-text-secondary)'>{subtitle}</div>}
              </>
            )}
            <div
              className={`${!isOpenFromGallery && (title || subtitle) ? 'pt-8' : ''} ${fullHeight ? 'flex h-full flex-col' : ''}`}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
      <div className='flex h-16 w-full justify-center bg-white'>
        <div className='m-4 w-full md:max-w-5xl'>{actions}</div>
      </div>
    </div>
  )
}

export default FormWrapper
