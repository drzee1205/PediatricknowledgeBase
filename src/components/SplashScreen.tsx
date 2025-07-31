'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true)
  const [isFading, setIsFading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const timer = setTimeout(() => {
      setIsFading(true)
      setTimeout(() => {
        setIsVisible(false)
      }, 500) // Fade out duration
    }, 2000) // Show splash screen for 2 seconds

    return () => clearTimeout(timer)
  }, [])

  if (!isVisible || !isMounted) return null

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-[#121212] transition-opacity duration-500 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-5xl md:text-6xl font-bold text-[#f2f2f2] mb-2 tracking-tight">
            NelsonGPT
          </h1>
          <p className="text-lg text-[#a0a0a0] font-light">
            Your Pediatric Medical Assistant
          </p>
          <div className="mt-3 text-sm text-[#707070]">
            Powered by Nelson Textbook of Pediatrics
          </div>
        </div>
        
        <div className="flex justify-center space-x-1">
          <div className="w-3 h-3 bg-[#f2f2f2] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-[#f2f2f2] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-[#f2f2f2] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <div className="text-xs text-[#505050]">
            Evidence-based pediatric care at your fingertips
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}