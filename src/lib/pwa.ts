export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available, show update notification
                  showUpdateNotification();
                }
              });
            }
          });
        })
        .catch((error) => {
          console.log('ServiceWorker registration failed: ', error);
        });
    });

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // Initialize mobile-specific features
    initializeMobileFeatures();
  }
}

export function unregisterServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}

// Initialize mobile-specific features
function initializeMobileFeatures() {
  // Prevent pull-to-refresh on mobile
  let lastTouchY = 0;
  let touchStartY = 0;
  
  document.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
    lastTouchY = touchStartY;
  }, { passive: true });
  
  document.addEventListener('touchmove', (e) => {
    const touchY = e.touches[0].clientY;
    const touchDiff = touchY - lastTouchY;
    
    // Prevent pull-to-refresh when at the top of the page
    if (window.scrollY === 0 && touchDiff > 0) {
      e.preventDefault();
    }
    
    lastTouchY = touchY;
  }, { passive: false });
  
  // Handle device orientation changes
  window.addEventListener('orientationchange', () => {
    // Adjust viewport for orientation change
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 100);
  });
  
  // Handle visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // App is visible again
      console.log('App is visible');
    } else {
      // App is hidden
      console.log('App is hidden');
    }
  });
  
  // Handle online/offline events with UI feedback
  window.addEventListener('online', () => {
    showOnlineNotification();
  });
  
  window.addEventListener('offline', () => {
    showOfflineNotification();
  });
}

// Show online notification
function showOnlineNotification() {
  if (typeof window !== 'undefined') {
    const notification = document.createElement('div');
    notification.className = 'fixed top-16 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto bg-green-500 text-white p-3 rounded-lg shadow-lg z-50 max-w-sm';
    notification.innerHTML = `
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        <span class="text-sm font-medium">You're back online</span>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 3000);
  }
}

// Show offline notification
function showOfflineNotification() {
  if (typeof window !== 'undefined') {
    const notification = document.createElement('div');
    notification.className = 'fixed top-16 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto bg-yellow-500 text-white p-3 rounded-lg shadow-lg z-50 max-w-sm';
    notification.innerHTML = `
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 bg-white rounded-full"></div>
        <span class="text-sm font-medium">You're offline</span>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 3000);
  }
}

// Show update notification
function showUpdateNotification() {
  if (typeof window !== 'undefined') {
    // Create a simple notification element
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-primary text-primary-foreground p-4 rounded-lg shadow-lg z-50 max-w-sm';
    notification.innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <p class="font-semibold">Update Available</p>
          <p class="text-sm">A new version of NelsonGPT is available.</p>
        </div>
        <div class="flex gap-2 ml-4">
          <button onclick="this.parentElement.parentElement.parentElement.remove()" class="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded">
            Later
          </button>
          <button onclick="window.location.reload()" class="px-3 py-1 text-sm bg-accent text-accent-foreground rounded">
            Update
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 10000);
  }
}

// Check if app is installed
export function isPWAInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check for standalone mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  // Check for iOS standalone mode
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isIOSStandalone = isIOS && (window as any).navigator.standalone;
  
  // Check for TWA (Trusted Web Activity)
  const isTWA = document.referrer.includes('android-app://');
  
  return isStandalone || isIOSStandalone || isTWA;
}

// Install PWA
export function installPWA(): void {
  if (typeof window === 'undefined') return;
  
  const deferredPrompt = (window as any).deferredPrompt;
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      (window as any).deferredPrompt = null;
    });
  }
}

// Listen for install prompt
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: any) => {
    e.preventDefault();
    (window as any).deferredPrompt = e;
  });
}

// Share functionality
export async function shareContent(title: string, text: string, url?: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url: url || window.location.href
      });
      return true;
    } catch (error) {
      console.log('Share cancelled:', error);
      return false;
    }
  } else {
    // Fallback: copy to clipboard
    try {
      const shareText = `${title}\n\n${text}\n\n${url || window.location.href}`;
      await navigator.clipboard.writeText(shareText);
      alert('Link copied to clipboard!');
      return true;
    } catch (error) {
      console.log('Clipboard access failed:', error);
      return false;
    }
  }
}

// Vibration patterns for different feedback
export function vibrate(pattern: number | number[] = 50): void {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

// Predefined vibration patterns
export const hapticPatterns = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 20, 10],
  error: [20, 10, 20],
  warning: [10, 10, 10],
  click: 5,
  doubleClick: [5, 5, 5]
};

// Screen orientation API
export function lockOrientation(orientation: OrientationLockType): Promise<void> {
  if (typeof window !== 'undefined' && 'screen' in window && 'orientation' in window.screen) {
    return (window.screen.orientation as any).lock(orientation);
  }
  return Promise.resolve();
}

export function unlockOrientation(): Promise<void> {
  if (typeof window !== 'undefined' && 'screen' in window && 'orientation' in window.screen) {
    return (window.screen.orientation as any).unlock();
  }
  return Promise.resolve();
}

// Network information API
export function getNetworkInfo(): {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  online: boolean;
} {
  if (typeof window === 'undefined') {
    return { online: navigator.onLine };
  }
  
  const connection = (navigator as any).connection;
  return {
    effectiveType: connection?.effectiveType,
    downlink: connection?.downlink,
    rtt: connection?.rtt,
    saveData: connection?.saveData,
    online: navigator.onLine
  };
}

// Battery status API
export function getBatteryStatus(): Promise<{
  level: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
} | null> {
  if (typeof window === 'undefined' || !('getBattery' in navigator)) {
    return Promise.resolve(null);
  }
  
  return (navigator as any).getBattery();
}

// Device memory API
export function getDeviceMemory(): number | null {
  if (typeof window === 'undefined' || !('deviceMemory' in navigator)) {
    return null;
  }
  
  return (navigator as any).deviceMemory;
}