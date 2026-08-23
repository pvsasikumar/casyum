import React from 'react';
import { Home, CalendarDays, Trophy, Handshake, UserPlus } from 'lucide-react';
import { AnimeNavBar } from './ui/anime-navbar';
import { useSiteCms } from '../hooks/useSiteCms';

const NAV_ITEMS = [
  { name: 'Home', url: '#home', icon: Home, pageId: 'home' as const },
  { name: 'About', url: '#about', icon: CalendarDays, pageId: 'about' as const },
  { name: 'Events', url: '#events', icon: Trophy, pageId: 'events' as const },
  { name: 'Sponsors', url: '#sponsors', icon: Handshake, pageId: 'sponsors' as const },
  { name: 'Register', url: '#register', icon: UserPlus, pageId: 'register' as const },
];

export const Navbar: React.FC = () => {
  const { ready, isNavVisible } = useSiteCms();

  // Until the CMS state arrives every item renders (original behavior), then
  // hidden pages are dropped from the navigation automatically.
  const visibleItems = ready ? NAV_ITEMS.filter((item) => isNavVisible(item.pageId)) : NAV_ITEMS;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] overflow-visible">
      <div className="relative max-w-7xl mx-auto px-4">
        <AnimeNavBar items={visibleItems} defaultActive="Home" />
      </div>
    </div>
  );
};
