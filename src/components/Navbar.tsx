import React from 'react';
import { Home, CalendarDays, Trophy, Handshake, UserPlus } from 'lucide-react';
import { AnimeNavBar } from './ui/anime-navbar';

const NAV_ITEMS = [
  { name: 'Home', url: '#home', icon: Home },
  { name: 'About', url: '#about', icon: CalendarDays },
  { name: 'Events', url: '#events', icon: Trophy },
  { name: 'Sponsors', url: '#sponsors', icon: Handshake },
  { name: 'Register', url: '#register', icon: UserPlus },
];

export const Navbar: React.FC = () => {
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] overflow-visible">
      <div className="relative max-w-7xl mx-auto px-4">
        <AnimeNavBar items={NAV_ITEMS} defaultActive="Home" />
      </div>
    </div>
  );
};
