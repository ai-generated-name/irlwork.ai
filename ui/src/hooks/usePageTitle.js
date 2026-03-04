import { useEffect } from 'react'

const DEFAULT_TITLE = 'irlwork — Real Tasks, Real People, Real Pay'

export function usePageTitle(title) {
  useEffect(() => {
    const prev = document.title
    document.title = title ? `${title} — irlwork` : DEFAULT_TITLE
    return () => { document.title = prev }
  }, [title])
}
