import { NextRequest, NextResponse } from 'next/server'
import { chatService } from '@/lib/services'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, content, role, citations } = await request.json()

    if (!sessionId || !content || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const message = await chatService.addMessage(sessionId, content, role, citations)
    return NextResponse.json({ message })
  } catch (error) {
    console.error('Error adding message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}