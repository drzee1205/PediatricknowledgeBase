import { NextRequest, NextResponse } from 'next/server';
import { mistralService } from '@/lib/mistral-service';
import { geminiService } from '@/lib/gemini-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      condition, 
      patientAge, 
      patientWeight, 
      allergies, 
      currentMedications, 
      severity,
      useGemini 
    } = body;

    // Validate required parameters
    if (!condition || typeof condition !== 'string') {
      return NextResponse.json(
        { error: 'Condition is required and must be a string' },
        { status: 400 }
      );
    }

    if (!patientAge || typeof patientAge !== 'string') {
      return NextResponse.json(
        { error: 'Patient age is required and must be a string' },
        { status: 400 }
      );
    }

    console.log(`Processing treatment recommendation request for ${condition}`);

    // Generate treatment recommendations using Mistral
    const mistralResult = await mistralService.generateTreatmentRecommendations({
      condition,
      patientAge,
      patientWeight,
      allergies,
      currentMedications,
      severity,
    });

    let enhancedTreatment = mistralResult.response;
    let geminiUsage = null;

    // Apply Gemini enhancement if requested
    if (useGemini && geminiService) {
      try {
        const geminiResult = await geminiService.enhanceMedicalContent({
          originalContent: mistralResult.response,
          enhancementType: 'expansion',
          targetAudience: 'clinicians',
          additionalContext: `Patient: ${patientAge} years old, ${patientWeight ? `${patientWeight} kg` : 'weight not specified'}, ${severity || 'unknown'} severity`,
        });

        enhancedTreatment = geminiResult.enhancedContent;
        geminiUsage = geminiResult.usage;
      } catch (geminiError) {
        console.error('Gemini treatment enhancement failed:', geminiError);
        // Continue with Mistral response
      }
    }

    const responseData = {
      condition,
      patientAge,
      patientWeight,
      allergies,
      currentMedications,
      severity,
      treatment: enhancedTreatment,
      metadata: {
        mistralUsage: mistralResult.usage,
        geminiUsage,
        enhancementApplied: !!geminiUsage,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Treatment recommendation API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}