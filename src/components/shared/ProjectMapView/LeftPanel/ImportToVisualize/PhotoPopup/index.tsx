import { FC, memo, useEffect, useMemo, useState } from 'react'
import { ItvFeatureProperties } from '@interfaces/entities'
import importToVisualize from '@/api/import-to-visualize'
import Image from 'next/image'
import { formatDateTime } from '@/utils/formatDate'
import { useSettings } from '@/hook/useSettings'
import { useTranslation } from 'react-i18next'
import Slider from 'react-slick'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import PhotoViewer from './PhotoViewer'

const NextArrow: FC<{ className?: string; style?: React.CSSProperties; onClick?: () => void }> = ({
  className,
  style,
  onClick,
}) => {
  return (
    <button
      type='button'
      className={`${className} right-1! z-10 before:text-[#040904]!`}
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
      className={`${className} left-1! z-10 before:text-[#040904]!`}
      style={{ ...style, display: 'block' }}
      onClick={onClick}
    ></button>
  )
}

interface Props {
  featureList: ItvFeatureProperties[]
}

const PhotoPopup: FC<Props> = ({ featureList }) => {
  const { language } = useSettings()
  const { t } = useTranslation('common')
  const [currentIndex, setCurrentIndex] = useState(0)

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
    afterChange: (index: number) => {
      setCurrentIndex(index)
    },
  }

  const [showViewer, setShowViewer] = useState(false)
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({})

  const imageList = useMemo(() => {
    return featureList.filter((feature) => feature.photoUploadId)
  }, [featureList])

  useEffect(() => {
    const urls: Record<string, string> = {}
    const loadThumbnails = async () => {
      await Promise.all(
        imageList.map(async (feature) => {
          if (feature.photoUploadId) {
            const blob = await importToVisualize.getThumbnail({ uploadId: feature.photoUploadId })
            urls[feature.photoUploadId] = URL.createObjectURL(blob)
          }
        })
      )
      setThumbnailUrls(urls)
    }
    loadThumbnails()
    return () => {
      Object.values(urls).forEach(URL.revokeObjectURL)
    }
  }, [imageList])

  return (
    <div className='h-[230px] w-[220px] lg:h-[410px] lg:w-[480px]'>
      <Slider {...settings}>
        {imageList.map((feature) => (
          <div key={feature.id} className='flex flex-col gap-4'>
            <div className='relative h-[150px] w-[220px] lg:h-[320px] lg:w-[480px]'>
              {thumbnailUrls[feature.photoUploadId as string] && (
                <Image
                  src={thumbnailUrls[feature.photoUploadId as string]}
                  fill
                  alt={'Popup Photo'}
                  draggable={false}
                  objectFit='contain'
                  className='hover:cursor-zoom-in'
                  onClick={() => setShowViewer(true)}
                />
              )}
            </div>
            <div className='mt-2 flex flex-col items-center'>
              <div className='flex gap-2'>
                <div className='text-gray'>{t('itv.popup.name')}:</div>
                <div>{feature.photoFileName || '-'}</div>
              </div>
              <div className='flex gap-2'>
                <div className='text-gray'>{t('itv.popup.imagingDate')}:</div>
                <div>
                  {feature.photoImagingDate ? formatDateTime(feature.photoImagingDate as string, language) : '-'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </Slider>
      {showViewer && (
        <PhotoViewer imageList={imageList} onClose={() => setShowViewer(false)} startIndex={currentIndex} />
      )}
    </div>
  )
}

export default memo(PhotoPopup)
