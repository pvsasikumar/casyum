'use client'

import { Suspense, lazy, useRef, useEffect } from 'react'
const Spline = lazy(() => import('@splinetool/react-spline'))

interface SplineSceneProps {
  scene: string
  className?: string
}

export function SplineScene({ scene, className }: SplineSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!containerRef.current) return
      const canvas = containerRef.current.querySelector('canvas')
      if (!canvas) return

      const eventInit = {
        clientX: event.clientX,
        clientY: event.clientY,
        screenX: event.screenX,
        screenY: event.screenY,
        bubbles: true,
        cancelable: true,
        buttons: event.buttons,
        view: window,
      }

      // Dispatch PointerEvent
      canvas.dispatchEvent(new PointerEvent('pointermove', {
        ...eventInit,
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        isPrimary: event.isPrimary,
      }))

      // Dispatch MouseEvent
      canvas.dispatchEvent(new MouseEvent('mousemove', eventInit))
    }

    window.addEventListener('pointermove', handlePointerMove)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
    }
  }, [])

  return (
    <Suspense 
      fallback={
        <div className="w-full h-full flex items-center justify-center">
          <span className="loader"></span>
        </div>
      }
    >
      <div ref={containerRef} className="w-full h-full">
        <Spline
          scene={scene}
          className={className}
        />
      </div>
    </Suspense>
  )
}
