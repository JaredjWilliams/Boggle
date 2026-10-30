import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '../lib/errorMessage'

type Options = {
  /** Replace the current value with the initial value when a load fails. */
  clearOnError?: boolean
}

/**
 * Load data when `deps` change, and again when `reload` runs.
 * A newer request ignores the result of an older one.
 */
export function useLoaded<T>(
  load: () => Promise<T>,
  initial: T,
  fallback: string,
  deps: readonly unknown[],
  options?: Options,
) {
  const [data, setData] = useState(initial)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [attempt, setAttempt] = useState(0)
  const request = useRef(0)
  const loadRef = useRef(load)
  const initialRef = useRef(initial)
  const clearOnError = options?.clearOnError === true
  const depKey = deps.map((item) => String(item)).join('\0')
  const [tracked, setTracked] = useState(`${attempt}\0${depKey}`)
  const nextTrack = `${attempt}\0${depKey}`
  if (tracked !== nextTrack) {
    setTracked(nextTrack)
    setLoading(true)
    setNotice('')
  }

  useEffect(() => {
    loadRef.current = load
  }, [load])

  useEffect(() => {
    const id = ++request.current
    void loadRef.current()
      .then((next) => {
        if (request.current !== id) return
        setData(next)
        setNotice('')
      })
      .catch((error: unknown) => {
        if (request.current !== id) return
        if (clearOnError) setData(initialRef.current)
        setNotice(errorMessage(error, fallback))
      })
      .finally(() => {
        if (request.current === id) setLoading(false)
      })
    return () => {
      request.current += 1
    }
  }, [attempt, fallback, clearOnError, depKey])

  const reload = useCallback(() => {
    setAttempt((current) => current + 1)
  }, [])

  return { data, loading, notice, reload }
}
