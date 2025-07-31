'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Menu, Send, Mic, Plus, Settings, History, BookOpen, X, ArrowLeft, Wifi, WifiOff, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import SplashScreen from '@/components/SplashScreen'
import MarkdownRenderer from '@/components/MarkdownRenderer'
import SettingsModal from '@/components/SettingsModal'
import GestureIndicator from '@/components/GestureIndicator'
import { useChatSessions, useTheme } from '@/lib/store'
import { useMobileFeatures, useTouchGestures, useMobileDetection, useHapticFeedback } from '@/hooks/use-mobile-features'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  citations?: string[]
}

export default function NelsonGPT() {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Mobile features
  const { isOnline, showInstallPrompt, handleInstall, dismissInstallPrompt } = useMobileFeatures()
  const { handleTouchStart, handleTouchMove, handleTouchEnd, handleSwipeRight } = useTouchGestures()
  const { isMobile } = useMobileDetection()
  const { lightFeedback, successFeedback, errorFeedback } = useHapticFeedback()
  
  // Handle swipe gestures for mobile
  const handleSwipeLeft = () => {
    if (isMobile) {
      setIsSidebarOpen(true)
      lightFeedback()
    }
  }
  
  const {
    currentSession,
    currentSessionId,
    chatSessions,
    createNewChat,
    deleteChat,
    switchToSession,
    addMessageToSession,
    clearSessionMessages,
    updateSessionTitle
  } = useChatSessions()
  
  const { settings } = useTheme()
  
  // Initialize with a session if none exists
  useEffect(() => {
    if (!currentSessionId && chatSessions.length === 0) {
      createNewChat()
    }
  }, [currentSessionId, chatSessions.length, createNewChat])
  
  // Sync messages with current session
  const messages = currentSession?.messages || [
    {
      id: '1',
      content: "Hello! I'm NelsonGPT, your advanced pediatric medical assistant powered by the Nelson Textbook of Pediatrics with RAG (Retrieval-Augmented Generation) capabilities. I can provide evidence-based medical information, differential diagnoses, treatment recommendations, and clinical reasoning. How can I assist you today?",
      role: 'assistant' as const,
      timestamp: new Date(),
      citations: ['Nelson Textbook of Pediatrics, 21st Edition']
    }
  ]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Focus input on load
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || !currentSessionId) return

    // Haptic feedback
    lightFeedback()

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date()
    }

    // Add message to store
    addMessageToSession(currentSessionId, userMessage)
    setInput('')
    setIsLoading(true)
    setIsSidebarOpen(false) // Close sidebar on mobile after sending message

    try {
      // Call RAG API
      const response = await fetch('/api/rag/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: input,
          sessionId: currentSessionId,
          chatHistory: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          enhancementOptions: {
            enableGemini: true,
            enhancementType: 'clinical_reasoning',
            targetAudience: 'clinicians',
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: 'assistant',
        timestamp: new Date(),
        citations: data.sources || []
      }
      
      // Add assistant message to store
      addMessageToSession(currentSessionId, assistantMessage)
      successFeedback()
    } catch (error) {
      console.error('Error getting AI response:', error)
      errorFeedback()
      
      // Fallback error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I apologize, but I encountered an error while processing your request. This could be due to a network issue or service interruption. Please try again in a moment.",
        role: 'assistant',
        timestamp: new Date(),
        citations: []
      }
      
      // Add error message to store
      addMessageToSession(currentSessionId, errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const clearChat = () => {
    if (currentSessionId) {
      clearSessionMessages(currentSessionId)
    }
    setIsSidebarOpen(false)
  }

  const handleNewChat = () => {
    createNewChat()
    setIsSidebarOpen(false)
    lightFeedback()
  }

  const handleSessionSwitch = (sessionId: string) => {
    switchToSession(sessionId)
    setIsSidebarOpen(false)
    lightFeedback()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  return (
    <>
      <SplashScreen />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <GestureIndicator />
      
      {/* Install Prompt */}
      {showInstallPrompt && (
        <div className="fixed bottom-4 left-4 right-4 z-50 sm:hidden">
          <Alert className="bg-primary text-primary-foreground border-primary">
            <Download className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-sm">Install NelsonGPT for better experience</span>
              <div className="flex gap-2 ml-2">
                <Button size="sm" variant="secondary" onClick={dismissInstallPrompt}>
                  Later
                </Button>
                <Button size="sm" onClick={handleInstall}>
                  Install
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      {/* Offline Status */}
      {!isOnline && (
        <div className="fixed top-16 left-0 right-0 z-40 sm:hidden">
          <Alert className="bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700">
            <WifiOff className="h-4 w-4" />
            <AlertDescription className="text-sm">
              You're offline. Some features may not be available.
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      <div className="flex flex-col h-screen bg-background">
        {/* Top Bar - Enhanced for mobile */}
        <div className="flex items-center justify-between p-2 sm:p-3 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="flex items-center gap-2">
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 touch-manipulation" onClick={() => lightFeedback()}>
                  <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 sm:w-80 bg-card border-border p-0">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">NelsonGPT</h2>
                    <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="touch-manipulation">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <SidebarContent 
                    chatSessions={chatSessions}
                    currentSessionId={currentSessionId}
                    onNewChat={handleNewChat}
                    onClearChat={clearChat}
                    onSessionSwitch={handleSessionSwitch}
                    onSettingsOpen={() => setIsSettingsOpen(true)}
                    onClose={() => setIsSidebarOpen(false)} 
                  />
                </div>
              </SheetContent>
            </Sheet>
            
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h1 className="text-base sm:text-lg font-bold">NelsonGPT</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Online status indicator */}
            <div className="hidden sm:flex items-center gap-1">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-yellow-500" />
              )}
            </div>
            
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 touch-manipulation" asChild>
              <a href="/clinical" onClick={() => lightFeedback()}>
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
              </a>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 touch-manipulation" onClick={() => { setIsSettingsOpen(true); lightFeedback(); }}>
              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Desktop */}
          <div className="hidden md:block w-80 bg-card border-r border-border">
            <SidebarContent 
              chatSessions={chatSessions}
              currentSessionId={currentSessionId}
              onNewChat={handleNewChat}
              onClearChat={clearChat}
              onSessionSwitch={handleSessionSwitch}
              onSettingsOpen={() => setIsSettingsOpen(true)}
            />
          </div>

          {/* Main Chat Area */}
          <div 
            className="flex-1 flex flex-col min-w-0"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => handleTouchEnd(handleSwipeLeft)}
          >
            {/* Messages */}
            <ScrollArea className="flex-1 p-1 sm:p-4">
              <div className="max-w-4xl mx-auto space-y-2 sm:space-y-4 px-1 sm:px-0">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[90%] sm:max-w-[80%] rounded-lg p-2 sm:p-4 message-fade-in ${
                        message.role === 'user'
                          ? 'bg-secondary text-secondary-foreground'
                          : 'bg-card text-card-foreground assistant-glow'
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words text-sm sm:text-base">
                        <MarkdownRenderer content={message.content} />
                      </div>
                      
                      {message.citations && settings.showCitations && message.citations.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border">
                          <div className="text-xs text-muted-foreground">
                            <strong>Sources:</strong> {message.citations.join(', ')}
                          </div>
                        </div>
                      )}
                      
                      {settings.showTimestamps && (
                        <div className="text-xs text-muted-foreground mt-2">
                          {formatTime(message.timestamp)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-card rounded-lg p-2 sm:p-4 assistant-glow">
                      <div className="flex items-center gap-2">
                        <div className="animate-pulse flex space-x-1">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                        </div>
                        <span className="text-xs sm:text-sm text-muted-foreground">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area - Enhanced for mobile */}
            <div className="border-t border-border p-2 sm:p-4 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 safe-area-bottom">
              <form onSubmit={handleSubmit} className="flex gap-1.5 sm:gap-2 max-w-4xl mx-auto">
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about pediatric conditions..."
                    className="pr-16 sm:pr-20 text-sm sm:text-base touch-manipulation"
                    disabled={isLoading}
                  />
                  <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 sm:h-8 sm:w-8 touch-manipulation"
                      disabled={isLoading}
                      onClick={() => {
                        // Voice input functionality
                        if ('webkitSpeechRecognition' in window) {
                          const recognition = new (window as any).webkitSpeechRecognition()
                          recognition.continuous = false
                          recognition.interimResults = false
                          recognition.lang = 'en-US'
                          
                          recognition.onstart = () => {
                            lightFeedback()
                          }
                          
                          recognition.onresult = (event: any) => {
                            const transcript = event.results[0][0].transcript
                            setInput(transcript)
                            successFeedback()
                          }
                          
                          recognition.onerror = () => {
                            errorFeedback()
                          }
                          
                          recognition.start()
                        } else {
                          alert('Voice input is not supported in your browser')
                        }
                      }}
                    >
                      <Mic className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 sm:h-8 sm:w-8 touch-manipulation"
                      disabled={isLoading}
                      onClick={() => {
                        // Clear input
                        setInput('')
                        lightFeedback()
                      }}
                    >
                      <X className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={isLoading || !input.trim()}
                  className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 touch-manipulation"
                >
                  <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </form>
              
              {/* Enhanced quick actions for mobile */}
              <div className="flex justify-center gap-2 mt-3 sm:hidden">
                <Button variant="ghost" size="sm" className="text-xs h-8 touch-manipulation" asChild>
                  <a href="/clinical" onClick={() => lightFeedback()}>
                    <BookOpen className="h-3 w-3 mr-1" />
                    Tools
                  </a>
                </Button>
                <Button variant="ghost" size="sm" className="text-xs h-8 touch-manipulation" onClick={() => { handleNewChat(); lightFeedback(); }}>
                  <Plus className="h-3 w-3 mr-1" />
                  New Chat
                </Button>
                <Button variant="ghost" size="sm" className="text-xs h-8 touch-manipulation" onClick={() => { setIsSettingsOpen(true); lightFeedback(); }}>
                  <Settings className="h-3 w-3 mr-1" />
                  Settings
                </Button>
              </div>
              
              {/* Mobile-specific suggestions */}
              <div className="mt-3 sm:hidden">
                <p className="text-xs text-muted-foreground text-center mb-2">Try asking about:</p>
                <div className="flex flex-wrap justify-center gap-1">
                  {[
                    'Fever in infants', 
                    'Asthma treatment', 
                    'Vaccine schedule', 
                    'Drug dosage'
                  ].map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-xs h-6 px-2 touch-manipulation"
                      onClick={() => {
                        setInput(suggestion)
                        inputRef.current?.focus()
                        lightFeedback()
                      }}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function SidebarContent({ 
  chatSessions, 
  currentSessionId, 
  onNewChat, 
  onClearChat, 
  onSessionSwitch, 
  onSettingsOpen,
  onClose 
}: { 
  chatSessions: any[]
  currentSessionId: string | null
  onNewChat: () => void
  onClearChat: () => void
  onSessionSwitch: (id: string) => void
  onSettingsOpen: () => void
  onClose?: () => void 
}) {
  const quickActions = [
    { title: 'Fever management', icon: '🌡️' },
    { title: 'Asthma treatment', icon: '🫁' },
    { title: 'Vaccine schedule', icon: '💉' },
    { title: 'Drug calculator', icon: '💊' },
  ]

  const getSessionTitle = (session: any) => {
    if (session.title && session.title !== 'New Chat') {
      return session.title
    }
    
    const firstMessage = session.messages?.[0]
    if (firstMessage?.role === 'user') {
      return firstMessage.content.substring(0, 30) + (firstMessage.content.length > 30 ? '...' : '')
    }
    
    return 'New Chat'
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 sm:p-4">
        <Button onClick={() => { onNewChat(); onClose?.(); }} className="w-full justify-start" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>
      
      <Separator />
      
      <div className="flex-1 p-3 sm:p-4">
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="ghost"
                className="w-full justify-start text-xs h-auto p-2 touch-manipulation"
                onClick={() => onClose?.()}
              >
                <span className="mr-1">{action.icon}</span>
                {action.title}
              </Button>
            ))}
          </div>
        </div>
        
        {chatSessions.length > 0 && (
          <div className="space-y-2 mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Recent Chats</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { onClearChat(); onClose?.(); }}
                className="text-xs touch-manipulation"
              >
                Clear
              </Button>
            </div>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {chatSessions.slice(0, 10).map((session) => (
                <Button
                  key={session.id}
                  variant={session.id === currentSessionId ? "secondary" : "ghost"}
                  className="w-full justify-start text-sm h-auto p-2 text-left touch-manipulation"
                  onClick={() => onSessionSwitch(session.id)}
                >
                  <div className="flex flex-col items-start w-full">
                    <span className="truncate w-full">{getSessionTitle(session)}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(session.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <Separator />
      
      <div className="p-3 sm:p-4 space-y-2">
        <Button variant="ghost" className="w-full justify-start touch-manipulation" asChild>
          <a href="/clinical" onClick={() => onClose?.()}>
            <BookOpen className="h-4 w-4 mr-2" />
            Clinical Tools
          </a>
        </Button>
        <Button variant="ghost" className="w-full justify-start touch-manipulation" onClick={() => { onSettingsOpen(); onClose?.(); }}>
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>
    </div>
  )
}