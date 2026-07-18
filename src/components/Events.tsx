import React from 'react';
import CircularGallery from './CircularGallery';

interface GalleryItem {
  image: string;
  text: string;
}

const GALLERY_ITEMS: GalleryItem[] = [
  {
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80',
    text: 'Nova Hack',
  },
  {
    image: 'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?auto=format&fit=crop&w=800&q=80',
    text: 'Cosmic Coders',
  },
  {
    image: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=800&q=80',
    text: 'Web Weaver',
  },
  {
    image: 'https://images.unsplash.com/photo-1518173946687-a4c8a383392f?auto=format&fit=crop&w=800&q=80',
    text: 'Quantum Quiz',
  },
  {
    image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80',
    text: 'Cyber Citadel',
  },
  {
    image: 'https://images.unsplash.com/photo-1561070791-26c113006238?auto=format&fit=crop&w=800&q=80',
    text: 'Pixel Perfect',
  },
];

export const Events: React.FC = () => {
  return (
    <section id="events" className="relative min-h-screen bg-black py-24 px-6 select-none overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-900/5 rounded-full blur-3xl" />

      <div className="max-w-6xl w-full mx-auto relative z-10 flex flex-col gap-12">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto flex flex-col gap-4">
          <span className="text-xs font-bold tracking-[0.3em] text-violet-400 uppercase">Challenge Yourself</span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-display text-gradient">
            Arena of Battles
          </h2>
          <p className="text-white/50 text-sm sm:text-base">
            Participate in multiple categories and compete with peers nationwide to win cash prizes and recognition. Drag or scroll to browse the gallery.
          </p>
        </div>

        {/* Circular Gallery Container */}
        <div className="w-full relative h-[450px] sm:h-[500px] md:h-[550px] overflow-hidden rounded-3xl border border-white/5 bg-neutral-950/40 backdrop-blur-sm">
          <CircularGallery
            items={GALLERY_ITEMS}
            bend={2.5}
            textColor="#e9d5ff"
            borderRadius={0.05}
            scrollEase={0.03}
            scrollSpeed={2.5}
            fontUrl="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&display=swap"
            font="bold 28px Space Grotesk"
          />
        </div>
      </div>
    </section>
  );
};
