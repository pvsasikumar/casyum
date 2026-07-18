import React from 'react';
import { Home, CalendarDays, Trophy, UserPlus } from 'lucide-react';
import { AnimeNavBar } from './ui/anime-navbar';

const NAV_ITEMS = [
  { name: 'Home', url: '#', icon: Home },
  { name: 'About', url: '#about', icon: CalendarDays },
  { name: 'Events', url: '#events', icon: Trophy },
  { name: 'Register', url: '#register', icon: UserPlus },
];

export const Navbar: React.FC = () => {
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] overflow-visible">
      <AnimeNavBar items={NAV_ITEMS} defaultActive="Home" />
    </div>
  );
};
