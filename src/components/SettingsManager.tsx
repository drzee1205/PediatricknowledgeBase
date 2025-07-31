'use client'

import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Moon, Sun, Bell, Volume2, VolumeX, Save, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'

interface UserSettings {
  theme: 'dark' | 'light'
  showCitations: boolean
  showTimestamps: boolean
  autoSaveChats: boolean
  voiceInputEnabled: boolean
  notificationsEnabled: boolean
  language: string
}

const defaultSettings: UserSettings = {
  theme: 'dark',
  showCitations: true,
  showTimestamps: true,
  autoSaveChats: true,
  voiceInputEnabled: false,
  notificationsEnabled: true,
  language: 'en'
}

export default function SettingsManager() {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(false)
  const [userId] = useState('demo-user') // In a real app, this would come from auth
  const { toast } = useToast()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      // In a real app, this would fetch from the API
      const savedSettings = localStorage.getItem(`nelsongpt-settings-${userId}`)
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings))
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  const saveSettings = async () => {
    setIsLoading(true)
    try {
      // Save to localStorage for now (in real app, would save to backend)
      localStorage.setItem(`nelsongpt-settings-${userId}`, JSON.stringify(settings))
      
      // Apply theme immediately
      if (settings.theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }

      toast({
        title: "Settings saved",
        description: "Your preferences have been saved successfully.",
      })
    } catch (error) {
      toast({
        title: "Error saving settings",
        description: "Failed to save your preferences. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetSettings = () => {
    setSettings(defaultSettings)
    toast({
      title: "Settings reset",
      description: "Settings have been reset to default values.",
    })
  }

  const exportData = () => {
    const data = {
      settings,
      chatHistory: localStorage.getItem(`nelsongpt-chats-${userId}`),
      timestamp: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nelsongpt-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast({
      title: "Data exported",
      description: "Your data has been exported successfully.",
    })
  }

  const clearData = () => {
    if (confirm('Are you sure you want to clear all chat history and settings? This action cannot be undone.')) {
      localStorage.removeItem(`nelsongpt-settings-${userId}`)
      localStorage.removeItem(`nelsongpt-chats-${userId}`)
      setSettings(defaultSettings)
      
      toast({
        title: "Data cleared",
        description: "All chat history and settings have been cleared.",
      })
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {settings.theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="theme">Theme</Label>
              <Select value={settings.theme} onValueChange={(value: 'dark' | 'light') => 
                setSettings(prev => ({ ...prev, theme: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="language">Language</Label>
              <Select value={settings.language} onValueChange={(value) => 
                setSettings(prev => ({ ...prev, language: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chat Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Chat Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Citations</Label>
              <p className="text-sm text-muted-foreground">Display medical reference citations</p>
            </div>
            <Switch
              checked={settings.showCitations}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, showCitations: checked }))
              }
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Timestamps</Label>
              <p className="text-sm text-muted-foreground">Display message timestamps</p>
            </div>
            <Switch
              checked={settings.showTimestamps}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, showTimestamps: checked }))
              }
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-save Chats</Label>
              <p className="text-sm text-muted-foreground">Automatically save chat history</p>
            </div>
            <Switch
              checked={settings.autoSaveChats}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, autoSaveChats: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Features Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                {settings.voiceInputEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                Voice Input
              </Label>
              <p className="text-sm text-muted-foreground">Enable voice-to-text input</p>
            </div>
            <Switch
              checked={settings.voiceInputEnabled}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, voiceInputEnabled: checked }))
              }
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </Label>
              <p className="text-sm text-muted-foreground">Enable app notifications</p>
            </div>
            <Switch
              checked={settings.notificationsEnabled}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, notificationsEnabled: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button onClick={exportData} variant="outline" className="w-full">
              Export Data
            </Button>
            <Button onClick={clearData} variant="destructive" className="w-full">
              Clear All Data
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            <p><strong>Export Data:</strong> Download your settings and chat history as a JSON file.</p>
            <p><strong>Clear All Data:</strong> Permanently delete all settings and chat history from this device.</p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button onClick={saveSettings} disabled={isLoading} className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          {isLoading ? 'Saving...' : 'Save Settings'}
        </Button>
        <Button onClick={resetSettings} variant="outline">
          Reset to Default
        </Button>
      </div>

      {/* App Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Badge variant="secondary">NelsonGPT</Badge>
              <Badge variant="outline">v1.0.0</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Your Pediatric Medical Assistant, Powered by Nelson Textbook of Pediatrics
            </p>
            <p className="text-xs text-muted-foreground">
              Built with Next.js, TypeScript, and z-ai-web-dev-sdk
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}