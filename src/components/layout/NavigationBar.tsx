'use client'

import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import { useRouter } from 'next/navigation'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import Button from '@mui/material/Button'
import { Tooltip } from '@mui/material'

type Crumb = { href?: string; label?: string; onClick?: () => void }

export type NavigationBarProps = {
  items?: Crumb[]
  children?: ReactNode
  backOnly?: boolean
  /**
   * Optional callback called before navigating to a href. Return true (or a Promise that resolves to true)
   * to allow navigation; return false to prevent it.
   */
  onBeforeNavigate?: (href?: string) => boolean | Promise<boolean>
}

export default function NavigationBar({ items, children, backOnly, onBeforeNavigate }: Readonly<NavigationBarProps>) {
  const router = useRouter()
  const { t } = useTranslation('common')

  const lastHref = [...(items || [])]
    .slice(0, -1)
    .reverse()
    .find(({ href }) => !!href)?.href

  async function navigateTo(href?: string) {
    if (!href) return
    try {
      const allowed = onBeforeNavigate ? await onBeforeNavigate(href) : true
      if (allowed) router.push(href)
    } catch {
      // swallow errors from the callback and prevent navigation
      // (caller can handle errors inside their callback if desired)
      // Optionally, you could console.error here during development.
    }
  }

  let breadcrumbs: ReactNode
  if (items) {
    if (items.length === 1 || (backOnly && items.length > 1)) {
      const item = items.length === 1 ? items[0] : items.at(-1)!
      breadcrumbs = (
        <Tooltip title={t(item.label || '')} onClick={item.onClick} arrow>
          <div
            className={`truncate text-(--color-text-primary) md:text-2xl ${item.onClick ? 'cursor-pointer hover:underline' : ''}`}
          >
            {t(item.label || '')}
          </div>
        </Tooltip>
      )
    } else {
      breadcrumbs = (
        <Breadcrumbs
          className='hidden overflow-hidden md:block'
          classes={{
            ol: 'flex-nowrap!',
            li: 'truncate',
          }}
        >
          {items.map(({ href, label, onClick }, idx) => {
            if (href) {
              return (
                <Tooltip key={idx} title={t(label || '')} arrow>
                  <a
                    href={href}
                    onClick={(e) => {
                      e.preventDefault()
                      void navigateTo(href)
                    }}
                    className='block truncate hover:underline'
                  >
                    {t(label || '')}
                  </a>
                </Tooltip>
              )
            } else {
              return (
                <Tooltip key={idx} title={t(label || '')} onClick={onClick} arrow>
                  <div
                    className={`truncate ${idx === items.length - 1 ? 'text-(--color-primary)' : ''} ${onClick ? 'cursor-pointer hover:underline' : ''}`}
                  >
                    {t(label || '')}
                  </div>
                </Tooltip>
              )
            }
          })}
        </Breadcrumbs>
      )
    }
  }

  return (
    <div className='flex h-12 w-full items-center gap-2 bg-white px-4 md:h-14'>
      {lastHref &&
        (backOnly ? (
          <Button className='min-w-0! px-2!' onClick={() => navigateTo(lastHref)}>
            <ArrowBackIosNewIcon />
          </Button>
        ) : (
          <Button className='md:hidden!' startIcon={<ArrowBackIosNewIcon />} onClick={() => navigateTo(lastHref)}>
            {t('navigation.back')}
          </Button>
        ))}

      <div className='min-w-0'>{breadcrumbs}</div>
      {children}
    </div>
  )
}
