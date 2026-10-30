import type { ReactNode } from 'react'

export function ScreenFrame({ header, children }: { header: ReactNode; children: ReactNode }) {
  return (
    <>
      {header}
      <div className="screen">{children}</div>
    </>
  )
}
