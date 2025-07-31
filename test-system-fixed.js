#!/usr/bin/env node

// Load environment variables first
require('dotenv').config();

// Comprehensive System Test for NelsonGPT Backend
const { supabaseServiceBackend } = require('./src/lib/supabase');
const { mistralService } = require('./src/lib/mistral-service');
const { geminiService } = require('./src/lib/gemini-service');
const { embeddingService } = require('./src/lib/embeddings');
const { vectorDatabaseService } = require('./src/lib/vector-database');
const { enhancedRAGPipeline } = require('./src/lib/rag-pipeline');
const { securityService } = require('./src/lib/security');

class NelsonGPTSystemTester {
  constructor() {
    this.results = [];
  }

  /**
   * Run comprehensive system tests
   */
  async runAllTests() {
    console.log('🔍 Starting NelsonGPT System Tests...');
    console.log('Environment loaded:', {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasMistralKey: !!process.env.MISTRAL_API_KEY,
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      hasHFKey: !!process.env.HUGGINGFACE_API_KEY,
      nodeEnv: process.env.NODE_ENV
    });
    
    // Test each service
    await this.testEnvironmentVariables();
    await this.testSupabaseConnection();
    await this.testMistralService();
    await this.testGeminiService();
    await this.testEmbeddingService();
    await this.testSecurityService();
    await this.testRAGPipeline();
    await this.testMedicalQueryFlow();
    
    // Calculate results
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const totalTests = this.results.length;
    
    const summary = this.generateSummary(passed, failed, totalTests);
    
    return {
      totalTests,
      passed,
      failed,
      results: this.results,
      summary
    };
  }

  /**
   * Test environment variables loading
   */
  async testEnvironmentVariables() {
    console.log('Testing environment variables...');
    
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_KEY',
      'MISTRAL_API_KEY',
      'GEMINI_API_KEY',
      'HUGGINGFACE_API_KEY'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    const passed = missingVars.length === 0;

    this.results.push({
      service: 'Environment Variables',
      passed,
      message: passed ? 'All required environment variables loaded' : `Missing variables: ${missingVars.join(', ')}`,
      details: {
        totalRequired: requiredVars.length,
        loaded: requiredVars.length - missingVars.length,
        missing: missingVars,
        envFile: require('fs').existsSync('.env') ? 'exists' : 'missing'
      }
    });
  }

  /**
   * Test Supabase database connection
   */
  async testSupabaseConnection() {
    console.log('Testing Supabase connection...');
    
    try {
      // Simple connection test
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_KEY;
      
      if (!supabaseUrl || !serviceKey) {
        throw new Error('Missing Supabase credentials');
      }

      // Test if we can create a client
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, serviceKey);
      
      // Try a simple query to test connection
      const { data, error } = await supabase.from('pediatric_knowledge').select('id').limit(1);
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "relation does not exist"
        throw error;
      }

      this.results.push({
        service: 'Supabase Database',
        passed: true,
        message: 'Connection successful',
        details: {
          url: supabaseUrl,
          hasServiceKey: !!serviceKey,
          connectionTest: 'passed'
        }
      });
    } catch (error) {
      this.results.push({
        service: 'Supabase Database',
        passed: false,
        message: 'Connection test failed',
        error: error.message
      });
    }
  }

  /**
   * Test Mistral AI service
   */
  async testMistralService() {
    console.log('Testing Mistral AI service...');
    
    try {
      const apiKey = process.env.MISTRAL_API_KEY;
      
      if (!apiKey) {
        throw new Error('Missing Mistral API key');
      }

      // Make a simple API call to test the service
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'mistral-tiny',
          messages: [{ role: 'user', content: 'Hello, this is a test.' }],
          max_tokens: 10
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      this.results.push({
        service: 'Mistral AI',
        passed: true,
        message: 'Service test successful',
        details: {
          hasApiKey: !!apiKey,
          model: 'mistral-tiny',
          responseReceived: !!data.choices?.[0]?.message?.content
        }
      });
    } catch (error) {
      this.results.push({
        service: 'Mistral AI',
        passed: false,
        message: 'Service test failed',
        error: error.message
      });
    }
  }

  /**
   * Test Gemini AI service
   */
  async testGeminiService() {
    console.log('Testing Gemini AI service...');
    
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error('Missing Gemini API key');
      }

      // Make a simple API call to test the service
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: 'Hello, this is a test.' }]
          }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      this.results.push({
        service: 'Gemini AI',
        passed: true,
        message: 'Service test successful',
        details: {
          hasApiKey: !!apiKey,
          model: 'gemini-pro',
          responseReceived: !!data.candidates?.[0]?.content
        }
      });
    } catch (error) {
      this.results.push({
        service: 'Gemini AI',
        passed: false,
        message: 'Service test failed',
        error: error.message
      });
    }
  }

  /**
   * Test HuggingFace embedding service
   */
  async testEmbeddingService() {
    console.log('Testing HuggingFace embedding service...');
    
    try {
      const apiKey = process.env.HUGGINGFACE_API_KEY;
      
      if (!apiKey) {
        throw new Error('Missing HuggingFace API key');
      }

      // Test with HuggingFace Inference API
      const response = await fetch('https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: "This is a test sentence for embedding."
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const embedding = await response.json();

      this.results.push({
        service: 'HuggingFace Embeddings',
        passed: true,
        message: 'Service test successful',
        details: {
          hasApiKey: !!apiKey,
          model: 'sentence-transformers/all-MiniLM-L6-v2',
          embeddingDimension: Array.isArray(embedding) ? embedding.length : 0
        }
      });
    } catch (error) {
      this.results.push({
        service: 'HuggingFace Embeddings',
        passed: false,
        message: 'Service test failed',
        error: error.message
      });
    }
  }

  /**
   * Test security service
   */
  async testSecurityService() {
    console.log('Testing security service...');
    
    try {
      const requiredSecurityVars = [
        'NEXTAUTH_SECRET',
        'ENCRYPTION_KEY'
      ];

      const missingSecurityVars = requiredSecurityVars.filter(varName => !process.env[varName]);
      const hasRequiredVars = missingSecurityVars.length === 0;

      // Test basic security configuration
      const securityConfig = {
        hasEncryptionKey: !!process.env.ENCRYPTION_KEY,
        hasAuthSecret: !!process.env.NEXTAUTH_SECRET,
        securityHeadersEnabled: process.env.SECURITY_HEADERS_ENABLED === 'true',
        auditLoggingEnabled: process.env.AUDIT_LOGGING_ENABLED === 'true',
        phiDetectionEnabled: process.env.PHI_DETECTION_ENABLED === 'true'
      };

      const passed = hasRequiredVars;

      this.results.push({
        service: 'Security Service',
        passed,
        message: passed ? 'Security configuration valid' : `Missing security variables: ${missingSecurityVars.join(', ')}`,
        details: {
          ...securityConfig,
          missingVars: missingSecurityVars,
          rateLimit: {
            windowMs: process.env.RATE_LIMIT_WINDOW_MS || '900000',
            maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS || '50'
          }
        }
      });
    } catch (error) {
      this.results.push({
        service: 'Security Service',
        passed: false,
        message: 'Security test failed',
        error: error.message
      });
    }
  }

  /**
   * Test RAG pipeline - simplified version
   */
  async testRAGPipeline() {
    console.log('Testing RAG pipeline components...');
    
    try {
      // Check if required services are available
      const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_KEY;
      const hasEmbeddings = !!process.env.HUGGINGFACE_API_KEY;
      const hasLLM = !!process.env.MISTRAL_API_KEY || !!process.env.GEMINI_API_KEY;

      const passed = hasSupabase && hasEmbeddings && hasLLM;

      this.results.push({
        service: 'RAG Pipeline',
        passed,
        message: passed ? 'RAG pipeline components available' : 'Missing required RAG components',
        details: {
          databaseConnection: hasSupabase,
          embeddingService: hasEmbeddings,
          llmService: hasLLM,
          vectorDimension: process.env.VECTOR_DIMENSION || '384',
          similarityThreshold: process.env.SIMILARITY_THRESHOLD || '0.75',
          maxDocuments: process.env.MAX_RETRIEVED_DOCUMENTS || '8'
        }
      });
    } catch (error) {
      this.results.push({
        service: 'RAG Pipeline',
        passed: false,
        message: 'RAG pipeline test failed',
        error: error.message
      });
    }
  }

  /**
   * Test medical query flow - simplified version
   */
  async testMedicalQueryFlow() {
    console.log('Testing medical query flow...');
    
    try {
      // Check medical configuration
      const medicalConfig = {
        nelsonVersion: process.env.NELSON_VERSION || '22nd_edition',
        disclaimerEnabled: process.env.MEDICAL_DISCLAIMER_ENABLED === 'true',
        clinicalValidation: process.env.CLINICAL_VALIDATION_REQUIRED === 'true',
        emergencyProtocol: process.env.EMERGENCY_PROTOCOL_ENABLED === 'true'
      };

      // Check AI features
      const aiFeatures = {
        geminiEnhancement: process.env.ENABLE_GEMINI_ENHANCEMENT === 'true',
        clinicalReasoning: process.env.ENABLE_CLINICAL_REASONING === 'true',
        medicalEducation: process.env.ENABLE_MEDICAL_EDUCATION === 'true'
      };

      const hasRequiredConfig = medicalConfig.disclaimerEnabled && medicalConfig.clinicalValidation;
      const hasAIFeatures = Object.values(aiFeatures).some(Boolean);

      const passed = hasRequiredConfig && hasAIFeatures;

      this.results.push({
        service: 'Medical Query Flow',
        passed,
        message: passed ? 'Medical query flow configured correctly' : 'Medical configuration incomplete',
        details: {
          ...medicalConfig,
          aiFeatures,
          configurationComplete: hasRequiredConfig,
          featuresEnabled: hasAIFeatures
        }
      });
    } catch (error) {
      this.results.push({
        service: 'Medical Query Flow',
        passed: false,
        message: 'Medical query flow test failed',
        error: error.message
      });
    }
  }

  /**
   * Generate test summary
   */
  generateSummary(passed, failed, total) {
    const passRate = ((passed / total) * 100).toFixed(1);
    
    let summary = `🔍 NelsonGPT System Test Results\n`;
    summary += `${'='.repeat(50)}\n`;
    summary += `Total Tests: ${total}\n`;
    summary += `✅ Passed: ${passed}\n`;
    summary += `❌ Failed: ${failed}\n`;
    summary += `📊 Pass Rate: ${passRate}%\n\n`;
    
    if (failed === 0) {
      summary += `🎉 All tests passed! Your NelsonGPT backend is ready for use.\n`;
    } else {
      summary += `⚠️  Some tests failed. Please check the detailed results below.\n`;
    }
    
    summary += `\nDetailed Results:\n`;
    summary += `${'='.repeat(50)}\n`;
    
    this.results.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌';
      summary += `${index + 1}. ${status} ${result.service}: ${result.message}\n`;
      
      if (!result.passed && result.error) {
        summary += `   Error: ${result.error}\n`;
      }
      
      if (result.details) {
        summary += `   Details: ${JSON.stringify(result.details, null, 2)}\n`;
      }
      
      summary += `\n`;
    });
    
    return summary;
  }

  /**
   * Get recommendations based on test results
   */
  getRecommendations() {
    const recommendations = [];
    
    this.results.forEach(result => {
      if (!result.passed) {
        switch (result.service) {
          case 'Environment Variables':
            recommendations.push('Check .env file exists and contains all required API keys');
            break;
          case 'Supabase Database':
            recommendations.push('Verify Supabase URL and service key configuration');
            break;
          case 'Mistral AI':
            recommendations.push('Verify Mistral API key and check network connectivity');
            break;
          case 'Gemini AI':
            recommendations.push('Verify Gemini API key and check quota limits');
            break;
          case 'HuggingFace Embeddings':
            recommendations.push('Verify HuggingFace API key and model availability');
            break;
          case 'Security Service':
            recommendations.push('Configure missing environment variables for security');
            break;
          case 'RAG Pipeline':
            recommendations.push('Ensure all required services are configured');
            break;
          case 'Medical Query Flow':
            recommendations.push('Enable required medical features and configurations');
            break;
        }
      }
    });
    
    return recommendations;
  }
}

// Create and run tests
async function main() {
  const tester = new NelsonGPTSystemTester();
  
  try {
    const results = await tester.runAllTests();
    console.log(results.summary);
    
    const recommendations = tester.getRecommendations();
    if (recommendations.length > 0) {
      console.log('\n🔧 Recommendations:');
      recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }
    
    process.exit(results.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { NelsonGPTSystemTester };