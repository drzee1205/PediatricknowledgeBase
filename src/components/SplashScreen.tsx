'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMobileDetection } from '@/hooks/use-mobile-features'

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true)
  const [isFading, setIsFading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const { isMobile, isStandalone } = useMobileDetection()

  useEffect(() => {
    setIsMounted(true)
    
    // Show splash screen longer for mobile/PWA installs
    const splashDuration = isMobile || isStandalone ? 3000 : 2000
    
    const timer = setTimeout(() => {
      setIsFading(true)
      setTimeout(() => {
        setIsVisible(false)
      }, 500) // Fade out duration
    }, splashDuration)

    return () => clearTimeout(timer)
  }, [isMobile, isStandalone])

  if (!isVisible || !isMounted) return null

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-[#121212] transition-opacity duration-500 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
      <div className="text-center px-4">
        {/* Logo/Icon Area */}
        <div className="mb-8">
          <div className="relative inline-block">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg">
              <svg className="w-12 h-12 md:w-14 md:h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            {/* Pulse effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl opacity-30 animate-ping"></div>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#f2f2f2] mb-2 tracking-tight">
            NelsonGPT
          </h1>
          <p className="text-base sm:text-lg text-[#a0a0a0] font-light">
            Your Pediatric Medical Assistant
          </p>
          <div className="mt-3 text-sm text-[#707070]">
            Powered by Nelson Textbook of Pediatrics
          </div>
        </div>
        
        {/* Loading Animation */}
        <div className="flex justify-center space-x-2 mb-8">
          <div className="w-3 h-3 bg-[#f2f2f2] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-[#f2f2f2] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-[#f2f2f2] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        
        {/* Mobile-specific features */}
        {isMobile && (
          <div className="space-y-2 mb-6">
            <div className="flex items-center justify-center space-x-4 text-xs text-[#707070]">
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span>Mobile Optimized</span>
              </div>
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <span>AI Powered</span>
              </div>
            </div>
            {isStandalone && (
              <div className="flex items-center justify-center space-x-1 text-xs text-green-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Installed as PWA</span>
              </div>
            )}
          </div>
        )}
        
        {/* Bottom tagline */}
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <div className="text-xs text-[#505050] max-w-sm mx-auto px-4">
            Evidence-based pediatric care at your fingertips
          </div>
          {isMobile && (
            <div className="text-xs text-[#404040] mt-1">
              Swipe gestures • Voice input • Offline support
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}