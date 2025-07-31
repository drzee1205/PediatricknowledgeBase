'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMobileDetection } from '@/hooks/use-mobile-features'
import { useHapticFeedback } from '@/hooks/use-mobile-features'

export default function GestureIndicator() {
  const [isVisible, setIsVisible] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)
  const { isMobile } = useMobileDetection()
  const { lightFeedback } = useHapticFeedback()

  useEffect(() => {
    if (!isMobile) return

    // Show gesture indicator for 10 seconds, then hide
    const timer = setTimeout(() => {
      setIsVisible(false)
    }, 10000)

    // Animate the indicator every 3 seconds
    const animationInterval = setInterval(() => {
      setIsAnimating(true)
      lightFeedback()
      setTimeout(() => setIsAnimating(false), 1000)
    }, 3000)

    return () => {
      clearTimeout(timer)
      clearInterval(animationInterval)
    }
  }, [isMobile, lightFeedback])

  if (!isMobile || !isVisible) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 pointer-events-none">
      <div className="bg-black/80 backdrop-blur-sm text-white p-3 rounded-lg shadow-lg max-w-sm mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ChevronLeft className={`w-5 h-5 transition-transform duration-300 ${isAnimating ? 'translate-x-1' : ''}`} />
            <span className="text-sm font-medium">Swipe for menu</span>
            <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${isAnimating ? '-translate-x-1' : ''}`} />
          </div>
          <button 
            onClick={() => {
              setIsVisible(false)
              lightFeedback()
            }}
            className="text-white/60 hover:text-white text-xs pointer-events-auto"
          >
            ✕
          </button>
        </div>
        <div className="mt-2 text-xs text-white/70">
          Try swiping left or right to navigate
        </div>
      </div>
    </div>
  )
}