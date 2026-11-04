import type { ReactNode } from 'react'

export function ScreenFrame({
  header,
  footer,
  children,
}: {
  header: ReactNode
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <>
      {header}
      <div className="screen">{children}</div>
      {footer}
    </>
  )
}
