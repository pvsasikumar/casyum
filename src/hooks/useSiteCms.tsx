import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loadPublishedPages, type CmsSitePageId, type ResolvedCmsPage } from '../services/cmsService';

type PagesMap = Record<CmsSitePageId, ResolvedCmsPage>;

interface SiteCmsContextValue {
  ready: boolean;
  pages: PagesMap;
  isPageVisible: (pageId: CmsSitePageId) => boolean;
  isNavVisible: (pageId: CmsSitePageId) => boolean;
}

const SiteCmsContext = createContext<SiteCmsContextValue | undefined>(undefined);

export const SiteCmsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pages, setPages] = useState<PagesMap>(() => ({} as PagesMap));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    loadPublishedPages().then((next) => {
      if (!active) return;
      setPages(next);
      setReady(true);
    });
    return () => {
      active = false;
    };
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