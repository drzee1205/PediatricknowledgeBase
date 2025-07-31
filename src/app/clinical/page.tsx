'use client'

import { useState } from 'react'
import { ArrowLeft, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ClinicalFeatures from '@/components/ClinicalFeatures'

export default function ClinicalPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-3 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <Button variant="ghost" size="icon" asChild>
          <a href="/">
            <ArrowLeft className="h-4 w-4" />
          </a>
        </Button>
        <h1 className="text-lg font-semibold">Clinical Tools</h1>
        <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex items-center gap-3 p-6 border-b">
        <Button variant="ghost" size="icon" asChild>
          <a href="/">
            <ArrowLeft className="h-5 w-5" />
          </a>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Clinical Tools</h1>
          <p className="text-muted-foreground">Evidence-based pediatric clinical resources</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-3 md:p-6">
        <ClinicalFeatures />
      </div>
    </div>
  )
}