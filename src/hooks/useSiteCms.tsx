import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  CMS_PAGE_IDS,
  subscribeCmsPages,
  type CmsSitePageId,
  type ResolvedCmsPage,
} from '../services/cmsService';

type PagesMap = Record<CmsSitePageId, ResolvedCmsPage>;

function defaultPagesMap(): PagesMap {
  const map = {} as PagesMap;
  CMS_PAGE_IDS.forEach((id) => {
    map[id] = {
      pageId: id,
      visible: true,
      navVisible: true,
      content: {},
      sections: {},
      updatedAt: '',
      updatedBy: '',
      updatedByName: '',
      publishedAt: '',
    };
  });
  return map;
}

interface SiteCmsContextValue {
  /** True once the first Firestore snapshot (or error fallback) arrived. */
  ready: boolean;
  pages: PagesMap;
  isPageVisible: (pageId: CmsSitePageId) => boolean;
  /** A navigation item shows only when the page itself is visible too. */
  isNavVisible: (pageId: CmsSitePageId) => boolean;
}

const SiteCmsContext = createContext<SiteCmsContextValue | undefined>(undefined);

/**
 * Subscribes the public website to the published CMS state
 * (`cms_pages`). Until the first snapshot arrives every page/section falls
 * back to visible with hardcoded defaults, so the site renders exactly as it
 * did before the CMS existed.
 */
export const SiteCmsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pages, setPages] = useState<PagesMap>(defaultPagesMap);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let first = true;
    const unsubscribe = subscribeCmsPages(
      (next) => {
        setPages(next);
        if (first) {
          first = false;
          setReady(true);
        }
      },
      () => {
        // Rules/network problem: keep the site fully visible with defaults.
        if (first) {
          first = false;
          setReady(true);
        }
      }
    );
    return unsubscribe;
  }, []);

  const value = useMemo<SiteCmsContextValue>(
    () => ({
      ready,
      pages,
      isPageVisible: (pageId) => pages[pageId]?.visible !== false,
      isNavVisible: (pageId) => {
        const page = pages[pageId];
        return !!page && page.visible !== false && page.navVisible !== false;
      },
    }),
    [ready, pages]
  );

  return <SiteCmsContext.Provider value={value}>{children}</SiteCmsContext.Provider>;
};

export function useSiteCms(): SiteCmsContextValue {
  const ctx = useContext(SiteCmsContext);
  if (!ctx) throw new Error('useSiteCms must be used within a SiteCmsProvider');
  return ctx;
}
