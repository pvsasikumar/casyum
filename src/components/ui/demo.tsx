import { LocationMap } from "@/components/ui/expand-map"

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center w-full">
      {/* Subtle background gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(139,92,246,0.03)_0%,_transparent_70%)]" />

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Optional subtle label */}
        <p className="text-neutral-500 text-xs font-medium tracking-[0.2em] uppercase">Symposium Venue</p>

        <LocationMap 
          location="TRP Auditorium, SRM University" 
          coordinates="Bharathi Salai, Ramapuram, Chennai, Tamil Nadu 600089 (13.0324° N, 80.1804° E)" 
          mapLink="https://maps.app.goo.gl/CcoQbdFwNVGqn4JA9"
        />
      </div>
    </main>
  )
}
