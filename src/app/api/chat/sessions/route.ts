import { NextRequest, NextResponse } from 'next/server'
import { chatService } from '@/lib/services'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const sessions = await chatService.getUserSessions(userId)
    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Error fetching chat sessions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, title } = await request.json()

    const session = await chatService.createSession(userId, title)
    return NextResponse.json({ session })
  } catch (error) {
    console.error('Error creating chat session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}