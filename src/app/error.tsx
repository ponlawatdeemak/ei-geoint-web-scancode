'use client'

import Link from 'next/link'

type ErrorPageProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const isDev = process.env.NODE_ENV !== 'production'

  return (
    <div className='min-h-screen bg-background px-4 py-8 sm:px-6 sm:py-10'>
      <div className='mx-auto flex min-h-[60vh] w-full max-w-2xl items-center'>
        <div className='w-full rounded-xl border border-divider bg-paper p-6 shadow-sm sm:p-8'>
          <h1 className='font-bold text-2xl text-text-primary sm:text-3xl'>Something went wrong</h1>
          <p className='mt-2 text-sm text-text-secondary sm:text-base'>
            We encountered an error while rendering this page. Please try again.
          </p>
          {isDev && error?.message ? (
            <div className='mt-4 rounded-md border border-error border-dashed bg-error/10 px-4 py-3'>
              <p className='text-error text-sm'>{error.message}</p>
            </div>
          ) : null}
          <div className='mt-6 flex flex-wrap justify-center gap-3'>
            <button
              type='button'
              onClick={reset}
              className='inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 font-medium text-sm text-white shadow-sm transition hover:bg-primary/90'
            >
              Try again
            </button>
            <Link
              href='/'
              className='inline-flex items-center justify-center rounded-md border border-divider px-4 py-2 font-medium text-sm text-text-primary transition hover:bg-action-selected'
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
