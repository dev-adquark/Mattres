'use client';

import { useEffect } from 'react';
import { OPEN_SEARCH_EVENT, type OpenSearchDetail } from './searchEvents';

/** Loads the SearchDialog module (shared by the lazy import and hover/focus preloading). */
export const importSearchDialog = () => import('./SearchDialog');

/**
 * Global search shortcuts, owned by the header so the dialog module itself
 * can load lazily on first use:
 *  - Cmd/Ctrl+K toggles the dialog,
 *  - "/" opens it when focus is not in a text field,
 *  - openSiteSearch(query) (OPEN_SEARCH_EVENT) opens it, optionally pre-filled.
 */
export function useSearchShortcuts(open: boolean, setOpen: (open: boolean, query?: string) => void): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const isK = event.key === 'k' || event.key === 'K';
      if (isK && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen(!open);
        return;
      }
      if (event.key === '/' && !open) {
        const t = event.target as HTMLElement | null;
        const typing = t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName));
        if (!typing) {
          event.preventDefault();
          setOpen(true);
        }
      }
    };
    const onOpenEvent = (e: Event) => {
      const detail = (e as CustomEvent<OpenSearchDetail | undefined>).detail;
      setOpen(true, detail && typeof detail.query === 'string' ? detail.query : '');
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpenEvent);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpenEvent);
    };
  }, [open, setOpen]);
}
