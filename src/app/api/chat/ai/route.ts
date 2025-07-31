import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { nelsonService } from '@/lib/services'

// System prompt for NelsonGPT
const SYSTEM_PROMPT = `You are NelsonGPT, an AI-powered pediatric medical assistant. Your knowledge is based on the Nelson Textbook of Pediatrics and other evidence-based medical sources.

Guidelines:
1. Provide accurate, evidence-based pediatric medical information
2. Always cite your sources when possible (Nelson Textbook of Pediatrics, specific chapters/pages)
3. Be concise but thorough in your responses
4. Use clear, professional medical language
5. Include important warnings or contraindications when relevant
6. For drug dosages, always mention that dosing should be verified and is weight-dependent
7. For emergency situations, emphasize the need for immediate medical attention
8. Never provide definitive diagnoses - suggest consulting with healthcare providers
9. Structure your responses with clear headings and bullet points when appropriate
10. Include relevant developmental milestones or age-specific considerations

Your tone should be professional, authoritative, and helpful, appropriate for healthcare professionals including pediatricians, residents, and medical students.`

export async function POST(request: NextRequest) {
  try {
    const { message, chatHistory = [] } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Initialize ZAI SDK
    const zai = await ZAI.create()

    // Search for relevant Nelson Textbook references
    const searchResults = await nelsonService.searchReferences(message)
    const context = searchResults.slice(0, 3).map(ref => 
      `Chapter ${ref.chapter}: ${ref.title}\n${ref.content.substring(0, 500)}...`
    ).join('\n\n')

    // Build conversation history
    const conversationHistory = chatHistory.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }))

    // Create the complete prompt
    const messages = [
      {
        role: 'system',
        content: SYSTEM_PROMPT
      },
      ...conversationHistory,
      {
        role: 'user',
        content: `User Query: ${message}\n\nRelevant Context from Nelson Textbook of Pediatrics:\n${context}\n\nPlease provide a comprehensive, evidence-based response with appropriate citations.`
      }
    ]

    // Generate AI response
    const completion = await zai.chat.completions.create({
      messages,
      temperature: 0.3, // Lower temperature for more factual responses
      max_tokens: 1000,
    })

    const aiResponse = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response at this time.'

    // Extract citations from the response or generate them from search results
    const citations = searchResults.slice(0, 3).map(ref => 
      `Nelson Textbook of Pediatrics, ${ref.edition}, Chapter ${ref.chapter}${ref.pageNumbers ? `, p. ${ref.pageNumbers}` : ''}`
    )

    return NextResponse.json({
      response: aiResponse,
      citations,
      sources: searchResults.slice(0, 3).map(ref => ({
        id: ref.id,
        title: ref.title,
        chapter: ref.chapter,
        pageNumbers: ref.pageNumbers
      }))
    })

  } catch (error) {
    console.error('Error generating AI response:', error)
    return NextResponse.json({ 
      error: 'Failed to generate response',
      response: 'I apologize, but I encountered an error while processing your request. Please try again.',
      citations: []
    }, { status: 500 })
  }
}