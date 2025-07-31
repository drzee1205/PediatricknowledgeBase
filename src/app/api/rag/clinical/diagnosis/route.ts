import { NextRequest, NextResponse } from 'next/server';
import { mistralService } from '@/lib/mistral-service';
import { geminiService } from '@/lib/gemini-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symptoms, patientAge, patientGender, additionalContext, useGemini } = body;

    // Validate required parameters
    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return NextResponse.json(
        { error: 'Symptoms are required and must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!patientAge || typeof patientAge !== 'string') {
      return NextResponse.json(
        { error: 'Patient age is required and must be a string' },
        { status: 400 }
      );
    }

    console.log(`Processing differential diagnosis request for ${patientAge} year old patient`);

    // Generate differential diagnosis using Mistral
    const mistralResult = await mistralService.generateDifferentialDiagnosis({
      symptoms,
      patientAge,
      patientGender,
      additionalContext,
    });

    let enhancedDiagnosis = mistralResult.response;
    let geminiUsage = null;

    // Apply Gemini enhancement if requested
    if (useGemini && geminiService) {
      try {
        const geminiResult = await geminiService.generateClinicalReasoning({
          patientCase: `${patientAge} year old ${patientGender || 'patient'} presenting with ${symptoms.join(', ')}`,
          availableData: {
            symptoms,
            vitals: {}, // Would be populated in real implementation
          },
          clinicalQuestion: 'What is the differential diagnosis and recommended diagnostic approach?',
        });

        enhancedDiagnosis = `
${mistralResult.response}

---

**Enhanced Clinical Reasoning (Gemini):**
${geminiResult.reasoning}
        `.trim();

        geminiUsage = geminiResult.usage;
      } catch (geminiError) {
        console.error('Gemini clinical reasoning failed:', geminiError);
        // Continue with Mistral response
      }
    }

    const responseData = {
      symptoms,
      patientAge,
      patientGender,
      diagnosis: enhancedDiagnosis,
      metadata: {
        mistralUsage: mistralResult.usage,
        geminiUsage,
        enhancementApplied: !!geminiUsage,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Differential diagnosis API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}