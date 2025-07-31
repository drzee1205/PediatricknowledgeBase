'use client'

import { useState, useEffect } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Settings {
  theme: 'dark' | 'light'
  showCitations: boolean
  showTimestamps: boolean
  autoSaveChats: boolean
  voiceInputEnabled: boolean
  notificationsEnabled: boolean
  language: string
}

interface ChatSession {
  id: string
  title: string
  messages: Array<{
    id: string
    content: string
    role: 'user' | 'assistant'
    timestamp: Date
    citations?: string[]
  }>
  createdAt: Date
  updatedAt: Date
}

interface AppState {
  settings: Settings
  chatSessions: ChatSession[]
  currentSessionId: string | null
  
  // Settings actions
  updateSettings: (settings: Partial<Settings>) => void
  resetSettings: () => void
  
  // Chat session actions
  createChatSession: (title?: string) => string
  deleteChatSession: (id: string) => void
  setCurrentSession: (id: string) => void
  updateChatSession: (id: string, updates: Partial<ChatSession>) => void
  
  // Message actions
  addMessage: (sessionId: string, message: Omit<ChatSession['messages'][0], 'id'>) => void
  clearMessages: (sessionId: string) => void
}

const defaultSettings: Settings = {
  theme: 'dark',
  showCitations: true,
  showTimestamps: true,
  autoSaveChats: true,
  voiceInputEnabled: false,
  notificationsEnabled: true,
  language: 'en'
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      chatSessions: [],
      currentSessionId: null,

      // Settings actions
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings }
        })),

      resetSettings: () =>
        set(() => ({
          settings: defaultSettings
        })),

      // Chat session actions
      createChatSession: (title = 'New Chat') => {
        const newSession: ChatSession = {
          id: Date.now().toString(),
          title,
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
        
        set((state) => ({
          chatSessions: [newSession, ...state.chatSessions],
          currentSessionId: newSession.id
        }))
        
        return newSession.id
      },

      deleteChatSession: (id) =>
        set((state) => ({
          chatSessions: state.chatSessions.filter((session) => session.id !== id),
          currentSessionId: state.currentSessionId === id ? null : state.currentSessionId
        })),

      setCurrentSession: (id) =>
        set(() => ({
          currentSessionId: id
        })),

      updateChatSession: (id, updates) =>
        set((state) => ({
          chatSessions: state.chatSessions.map((session) =>
            session.id === id ? { ...session, ...updates, updatedAt: new Date() } : session
          )
        })),

      // Message actions
      addMessage: (sessionId, message) => {
        const messageWithId: ChatSession['messages'][0] = {
          ...message,
          id: Date.now().toString()
        }
        
        set((state) => {
          const updatedSessions = state.chatSessions.map((session) => {
            if (session.id === sessionId) {
              return {
                ...session,
                messages: [...session.messages, messageWithId],
                updatedAt: new Date()
              }
            }
            return session
          })
          
          return {
            chatSessions: updatedSessions
          }
        })
      },

      clearMessages: (sessionId) =>
        set((state) => ({
          chatSessions: state.chatSessions.map((session) =>
            session.id === sessionId
              ? { ...session, messages: [], updatedAt: new Date() }
              : session
          )
        }))
    }),
    {
      name: 'nelsongpt-storage',
      partialize: (state) => ({
        settings: state.settings,
        chatSessions: state.chatSessions,
        currentSessionId: state.currentSessionId
      })
    }
  )
)

// Hook for managing theme
export function useTheme() {
  const { settings, updateSettings } = useAppStore()
  
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [settings.theme])
  
  const toggleTheme = () => {
    updateSettings({
      theme: settings.theme === 'dark' ? 'light' : 'dark'
    })
  }
  
  return { settings, theme: settings.theme, toggleTheme, updateSettings }
}

// Hook for managing chat sessions
export function useChatSessions() {
  const {
    chatSessions,
    currentSessionId,
    createChatSession,
    deleteChatSession,
    setCurrentSession,
    updateChatSession,
    addMessage,
    clearMessages
  } = useAppStore()
  
  const currentSession = chatSessions.find(session => session.id === currentSessionId)
  
  const createNewChat = (title?: string) => {
    const sessionId = createChatSession(title)
    return sessionId
  }
  
  const deleteChat = (id: string) => {
    deleteChatSession(id)
  }
  
  const switchToSession = (id: string) => {
    setCurrentSession(id)
  }
  
  const addMessageToSession = (sessionId: string, message: Omit<ChatSession['messages'][0], 'id'>) => {
    addMessage(sessionId, message)
  }
  
  const clearSessionMessages = (sessionId: string) => {
    clearMessages(sessionId)
  }
  
  const updateSessionTitle = (sessionId: string, title: string) => {
    updateChatSession(sessionId, { title })
  }
  
  return {
    chatSessions,
    currentSession,
    currentSessionId,
    createNewChat,
    deleteChat,
    switchToSession,
    addMessageToSession,
    clearSessionMessages,
    updateSessionTitle
  }
}