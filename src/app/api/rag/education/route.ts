import { NextRequest, NextResponse } from 'next/server';
import { geminiService } from '@/lib/gemini-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      topic, 
      difficultyLevel, 
      contentType, 
      targetAudience 
    } = body;

    // Validate required parameters
    if (!topic || typeof topic !== 'string') {
      return NextResponse.json(
        { error: 'Topic is required and must be a string' },
        { status: 400 }
      );
    }

    const validDifficultyLevels = ['beginner', 'intermediate', 'advanced'];
    const validContentTypes = ['overview', 'deep_dive', 'case_study', 'q_and_a'];
    const validAudiences = ['medical_students', 'residents', 'fellows', 'attendings'];

    if (difficultyLevel && !validDifficultyLevels.includes(difficultyLevel)) {
      return NextResponse.json(
        { error: `Invalid difficulty level. Must be one of: ${validDifficultyLevels.join(', ')}` },
        { status: 400 }
      );
    }

    if (contentType && !validContentTypes.includes(contentType)) {
      return NextResponse.json(
        { error: `Invalid content type. Must be one of: ${validContentTypes.join(', ')}` },
        { status: 400 }
      );
    }

    if (targetAudience && !validAudiences.includes(targetAudience)) {
      return NextResponse.json(
        { error: `Invalid target audience. Must be one of: ${validAudiences.join(', ')}` },
        { status: 400 }
      );
    }

    console.log(`Generating medical education content for topic: ${topic}`);

    // Generate educational content using Gemini
    const result = await geminiService.generateMedicalEducation({
      topic,
      difficultyLevel: difficultyLevel || 'intermediate',
      contentType: contentType || 'overview',
      targetAudience: targetAudience || 'residents',
    });

    const responseData = {
      topic,
      difficultyLevel,
      contentType,
      targetAudience,
      content: result.educationalContent,
      metadata: {
        geminiUsage: result.usage,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Medical education API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}