import { ItvFeatureProperties } from '@interfaces/entities'
import { Dialog, DialogContent, IconButton } from '@mui/material'
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import Slider from 'react-slick'
import Image from 'next/image'
import importToVisualize from '@/api/import-to-visualize'
import { formatDateTime } from '@/utils/formatDate'
import { t } from 'i18next'
import { useSettings } from '@/hook/useSettings'

import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'

const NextArrow: FC<{ className?: string; style?: React.CSSProperties; onClick?: () => void }> = ({
  className,
  style,
  onClick,
}) => {
  return (
    <button
      type='button'
      className={`${className} right-[24px]! z-10 before:text-3xl! before:text-[#F1F4FB]! md:before:text-5xl! lg:right-[36px]!`}
      style={{ ...style, display: 'block' }}
      onClick={onClick}
    ></button>
  )
}

const PrevArrow: FC<{ className?: string; style?: React.CSSProperties; onClick?: () => void }> = ({
  className,
  style,
  onClick,
}) => {
  return (
    <button
      type='button'
      className={`${className} left-[12px]! z-10 before:text-3xl! before:text-[#F1F4FB]! md:before:text-5xl!`}
      style={{ ...style, display: 'block' }}
      onClick={onClick}
    ></button>
  )
}

interface PhotoViewerProps {
  imageList: ItvFeatureProperties[]
  onClose: () => void
  startIndex: number
}
const PhotoViewer: FC<PhotoViewerProps> = ({ imageList, onClose, startIndex }) => {
  const { language } = useSettings()
  const [currentIndex, setCurrentIndex] = useState(startIndex)
  const [nav1, setNav1] = useState<Slider | null>(null)
  const [nav2, setNav2] = useState<Slider | null>(null)

  const thumbnailUrl = useCallback((uploadId: string, isNative?: boolean) => {
    const url = importToVisualize.getThumbnailUrl({ uploadId }, isNative)
    return url
  }, [])

  useEffect(() => {
    setCurrentIndex(startIndex)
  }, [startIndex])

  const settingsBig = useMemo(() => {
    return {
      dots: false,
      infinite: true,
      speed: 500,
      slidesToShow: 1,
      slidesToScroll: 1,
      nextArrow: <NextArrow />,
      prevArrow: <PrevArrow />,
      afterChange: (index: number) => setCurrentIndex(index),
    }
  }, [])

  useEffect(() => {
    if (nav1 && nav2) {
      nav1.slickGoTo(currentIndex)
      nav2.slickGoTo(currentIndex)
    }
  }, [currentIndex, nav1, nav2])

  const settingsSmall = useMemo(() => {
    return {
      dots: false,
      infinite: true,
      speed: 500,
      slidesToShow: 3,
      slidesToScroll: 1,
      swipeToSlide: true,
      focusOnSelect: true,
    }
  }, [])

  return (
    <Dialog fullScreen open hideBackdrop sx={{ '& .MuiDialog-paper': { backgroundColor: 'transparent' } }}>
      <DialogContent className='overflow-hidden! relative bg-[#000000E5] p-0!'>
        <IconButton size='small' onClick={onClose} className='absolute! top-2 right-2 z-10 ml-2'>
          <CloseIcon fontSize='small' sx={{ color: 'white' }} />
        </IconButton>
        <div className='flex h-full flex-col justify-between gap-4'>
          <Slider
            {...settingsBig}
            asNavFor={nav2 ? nav2 : undefined}
            ref={(slider) => setNav1(slider)}
            className='h-full'
          >
            {imageList.map((feature) => (
              <div key={feature.id} className='gap-4 pt-8'>
                <div className='mt-2 flex flex-col items-center justify-center gap-2 lg:flex-row lg:gap-6'>
                  <div className='flex gap-2'>
                    <div className='text-white'>{t('itv.popup.name')}:</div>
                    <div className='text-white'>{feature.photoFileName || '-'}</div>
                  </div>
                  <div className='flex gap-2'>
                    <div className='text-white'>{t('itv.popup.imagingDate')}:</div>
                    <div className='text-white'>
                      {feature.photoImagingDate ? formatDateTime(feature.photoImagingDate as string, language) : '-'}
                    </div>
                  </div>
                </div>
                <div className='relative h-[65vh] w-full'>
                  <Image
                    src={thumbnailUrl(feature.photoUploadId as string, true)}
                    fill
                    alt={'Popup Photo'}
                    draggable={false}
                    objectFit='contain'
                    unoptimized
                  />
                </div>
              </div>
            ))}
          </Slider>
          <Slider
            {...settingsSmall}
            asNavFor={nav1 ? nav1 : undefined}
            ref={(slider) => setNav2(slider)}
            className='px-4'
          >
            {imageList.map((feature, index) => (
              <div key={feature.id} className='h-[15vh] w-[25vw]!'>
                <div className='relative h-full w-full'>
                  <Image
                    src={thumbnailUrl(feature.photoUploadId as string)}
                    fill
                    alt={'Popup Photo'}
                    draggable={false}
                    objectFit='contain'
                    className={currentIndex === index ? 'grayscale-0' : 'grayscale-100'}
                  />
                </div>
              </div>
            ))}
          </Slider>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default PhotoViewer
