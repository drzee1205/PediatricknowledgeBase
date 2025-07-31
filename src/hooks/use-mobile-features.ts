import { useState, useEffect } from 'react'
import { isPWAInstalled, installPWA, getNetworkInfo, getBatteryStatus, getDeviceMemory, shareContent, hapticPatterns } from '@/lib/pwa'

export function useMobileFeatures() {
  const [isInstalled, setIsInstalled] = useState(false)
  const [canInstall, setCanInstall] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [networkInfo, setNetworkInfo] = useState(getNetworkInfo())
  const [batteryStatus, setBatteryStatus] = useState<any>(null)
  const [deviceMemory, setDeviceMemory] = useState<number | null>(null)

  useEffect(() => {
    // Check if PWA is installed
    setIsInstalled(isPWAInstalled())
    
    // Check online status
    setIsOnline(navigator.onLine)
    
    // Get device info
    setDeviceMemory(getDeviceMemory())
    
    // Get battery status
    getBatteryStatus().then(setBatteryStatus)
    
    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      setNetworkInfo(getNetworkInfo())
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      setNetworkInfo(getNetworkInfo())
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Check if install is available
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setCanInstall(true)
      setShowInstallPrompt(true)
      
      // Auto-hide prompt after 10 seconds
      setTimeout(() => {
        setShowInstallPrompt(false)
      }, 10000)
    }
    
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setCanInstall(false)
      setShowInstallPrompt(false)
    }
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    
    // Listen for network changes
    const connection = (navigator as any).connection
    if (connection) {
      const handleConnectionChange = () => {
        setNetworkInfo(getNetworkInfo())
      }
      
      connection.addEventListener('change', handleConnectionChange)
    }
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      
      if (connection) {
        connection.removeEventListener('change', connection.onchange)
      }
    }
  }, [])

  const handleInstall = () => {
    installPWA()
    setShowInstallPrompt(false)
  }

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false)
  }

  const shareApp = async () => {
    return await shareContent(
      'NelsonGPT - Pediatric Medical Assistant',
      'AI-powered pediatric medical assistant powered by Nelson Textbook of Pediatrics. Get evidence-based clinical support on your device!'
    )
  }

  return {
    isInstalled,
    canInstall,
    isOnline,
    showInstallPrompt,
    networkInfo,
    batteryStatus,
    deviceMemory,
    handleInstall,
    dismissInstallPrompt,
    shareApp
  }
}

// Touch gesture utilities
export function useTouchGestures() {
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const [touchStartY, setTouchStartY] = useState(0)
  const [touchEndY, setTouchEndY] = useState(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
    setTouchStartY(e.targetTouches[0].clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
    setTouchEndY(e.targetTouches[0].clientY)
  }

  const handleTouchEnd = (callback: () => void) => {
    const deltaX = touchStart - touchEnd
    const deltaY = touchStartY - touchEndY
    
    // Only trigger if horizontal swipe is more significant than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 75) {
      // Swipe left
      callback()
    }
  }

  const handleSwipeRight = (callback: () => void) => {
    const deltaX = touchEnd - touchStart
    const deltaY = touchEndY - touchStartY
    
    // Only trigger if horizontal swipe is more significant than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 75) {
      // Swipe right
      callback()
    }
  }

  const handleSwipeUp = (callback: () => void) => {
    const deltaY = touchStartY - touchEndY
    const deltaX = touchStart - touchEnd
    
    // Only trigger if vertical swipe is more significant than horizontal
    if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY > 75) {
      // Swipe up
      callback()
    }
  }

  const handleSwipeDown = (callback: () => void) => {
    const deltaY = touchEndY - touchStartY
    const deltaX = touchStart - touchEnd
    
    // Only trigger if vertical swipe is more significant than horizontal
    if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY > 75) {
      // Swipe down
      callback()
    }
  }

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleSwipeRight,
    handleSwipeUp,
    handleSwipeDown
  }
}

// Mobile detection utilities
export function useMobileDetection() {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      setIsMobile(width < 768)
      setIsTablet(width >= 768 && width < 1024)
      setIsDesktop(width >= 1024)
      
      // Check OS
      const userAgent = navigator.userAgent.toLowerCase()
      setIsIOS(/ipad|iphone|ipod/.test(userAgent))
      setIsAndroid(/android/.test(userAgent))
      
      // Check if running as standalone PWA
      setIsStandalone(
        window.matchMedia('(display-mode: standalone)').matches ||
        (window as any).navigator.standalone ||
        document.referrer.includes('android-app://')
      )
    }

    checkDevice()
    window.addEventListener('resize', checkDevice)
    
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  return { isMobile, isTablet, isDesktop, isIOS, isAndroid, isStandalone }
}

// Haptic feedback utilities
export function useHapticFeedback() {
  const vibrate = (pattern: number | number[] = 50) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  }

  const lightFeedback = () => vibrate(hapticPatterns.light)
  const mediumFeedback = () => vibrate(hapticPatterns.medium)
  const heavyFeedback = () => vibrate(hapticPatterns.heavy)
  const successFeedback = () => vibrate(hapticPatterns.success)
  const errorFeedback = () => vibrate(hapticPatterns.error)
  const warningFeedback = () => vibrate(hapticPatterns.warning)
  const clickFeedback = () => vibrate(hapticPatterns.click)

  return {
    vibrate,
    lightFeedback,
    mediumFeedback,
    heavyFeedback,
    successFeedback,
    errorFeedback,
    warningFeedback,
    clickFeedback
  }
}