'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Menu, Send, Mic, Plus, Settings, History, BookOpen, X, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import SplashScreen from '@/components/SplashScreen'
import MarkdownRenderer from '@/components/MarkdownRenderer'
import SettingsModal from '@/components/SettingsModal'
import { useChatSessions, useTheme } from '@/lib/store'

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
    } catch (error) {
      console.error('Error getting AI response:', error)
      
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
  }

  const handleSessionSwitch = (sessionId: string) => {
    switchToSession(sessionId)
    setIsSidebarOpen(false)
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
      <div className="flex flex-col h-screen bg-background">
        {/* Top Bar - Enhanced for mobile */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="flex items-center gap-2 sm:gap-3">
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                  <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 bg-card border-border p-0">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">NelsonGPT</h2>
                    <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}>
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
            
            <div className="flex items-center gap-1.5 sm:gap-2">
              <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <h1 className="text-lg sm:text-xl font-bold">NelsonGPT</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
              Nelson Textbook
            </Badge>
            <Badge variant="outline" className="text-xs">
              Pediatric AI
            </Badge>
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
          <div className="flex-1 flex flex-col min-w-0">
            {/* Messages */}
            <ScrollArea className="flex-1 p-2 sm:p-4">
              <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4 px-2 sm:px-0">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-3 sm:p-4 message-fade-in ${
                        message.role === 'user'
                          ? 'bg-secondary text-secondary-foreground'
                          : 'bg-card text-card-foreground assistant-glow'
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">
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
                    <div className="bg-card rounded-lg p-3 sm:p-4 assistant-glow">
                      <div className="flex items-center gap-2">
                        <div className="animate-pulse flex space-x-1">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                        </div>
                        <span className="text-sm text-muted-foreground">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area - Enhanced for mobile */}
            <div className="border-t border-border p-2 sm:p-4 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
              <form onSubmit={handleSubmit} className="flex gap-1.5 sm:gap-2 max-w-4xl mx-auto">
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about pediatric conditions, treatments, or differential diagnoses..."
                    className="pr-10 sm:pr-12 text-sm sm:text-base"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 sm:h-8 sm:w-8"
                    disabled={isLoading}
                  >
                    <Mic className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={isLoading || !input.trim()}
                  className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
                >
                  <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </form>
              
              {/* Quick actions for mobile */}
              <div className="flex justify-center gap-2 mt-2 sm:hidden">
                <Button variant="ghost" size="sm" className="text-xs" asChild>
                  <a href="/clinical">
                    <BookOpen className="h-3 w-3 mr-1" />
                    Tools
                  </a>
                </Button>
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
      <div className="p-4">
        <Button onClick={() => { onNewChat(); onClose?.(); }} className="w-full justify-start" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>
      
      <Separator />
      
      <div className="flex-1 p-4">
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="ghost"
                className="w-full justify-start text-xs h-auto p-2"
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
                className="text-xs"
              >
                Clear
              </Button>
            </div>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {chatSessions.slice(0, 10).map((session) => (
                <Button
                  key={session.id}
                  variant={session.id === currentSessionId ? "secondary" : "ghost"}
                  className="w-full justify-start text-sm h-auto p-2 text-left"
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
      
      <div className="p-4 space-y-2">
        <Button variant="ghost" className="w-full justify-start" asChild>
          <a href="/clinical" onClick={() => onClose?.()}>
            <BookOpen className="h-4 w-4 mr-2" />
            Clinical Tools
          </a>
        </Button>
        <Button variant="ghost" className="w-full justify-start" onClick={() => { onSettingsOpen(); onClose?.(); }}>
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>
    </div>
  )
}