import './page.css'

type Props = {
  loading?: boolean
  loadingLabel?: string
  notice?: string
  onRetry?: () => void
  statusClassName?: string
}

export function StatusBlock({
  loading = false,
  loadingLabel = '',
  notice = '',
  onRetry,
  statusClassName = 'page-status',
}: Props) {
  return (
    <>
      {loading && loadingLabel && <p className={statusClassName}>{loadingLabel}</p>}
      {notice && (
        <div className="page-alert" role="alert">
          <p>{notice}</p>
          {onRetry && (
            <button type="button" className="page-retry" onClick={onRetry}>
              Try again
            </button>
          )}
        </div>
      )}
    </>
  )
}
