#!/usr/bin/env node

// Load environment variables first
require('dotenv').config();

// Simple standalone API testing without complex imports
const fetch = require('node-fetch').default || require('node-fetch');

class NelsonGPTAPITester {
  constructor() {
    this.results = [];
  }

  /**
   * Run comprehensive API tests
   */
  async runAllTests() {
    console.log('🔍 Starting NelsonGPT API Tests...');
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
    await this.testMistralAPI();
    await this.testGeminiAPI();
    await this.testHuggingFaceAPI();
    await this.testSecurityConfiguration();
    
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
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_KEY;
      
      if (!supabaseUrl || !serviceKey) {
        throw new Error('Missing Supabase credentials');
      }

      // Test the REST API endpoint
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`
        }
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(`Supabase connection failed: ${response.status}`);
      }

      this.results.push({
        service: 'Supabase Database',
        passed: true,
        message: 'Connection successful',
        details: {
          url: supabaseUrl,
          hasServiceKey: !!serviceKey,
          statusCode: response.status,
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
   * Test Mistral AI API
   */
  async testMistralAPI() {
    console.log('Testing Mistral AI API...');
    
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
        service: 'Mistral AI API',
        passed: true,
        message: 'API test successful',
        details: {
          hasApiKey: !!apiKey,
          model: 'mistral-tiny',
          responseReceived: !!data.choices?.[0]?.message?.content,
          statusCode: response.status
        }
      });
    } catch (error) {
      this.results.push({
        service: 'Mistral AI API',
        passed: false,
        message: 'API test failed',
        error: error.message
      });
    }
  }

  /**
   * Test Gemini AI API
   */
  async testGeminiAPI() {
    console.log('Testing Gemini AI API...');
    
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
        service: 'Gemini AI API',
        passed: true,
        message: 'API test successful',
        details: {
          hasApiKey: !!apiKey,
          model: 'gemini-pro',
          responseReceived: !!data.candidates?.[0]?.content,
          statusCode: response.status
        }
      });
    } catch (error) {
      this.results.push({
        service: 'Gemini AI API',
        passed: false,
        message: 'API test failed',
        error: error.message
      });
    }
  }

  /**
   * Test HuggingFace API
   */
  async testHuggingFaceAPI() {
    console.log('Testing HuggingFace API...');
    
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
        service: 'HuggingFace API',
        passed: true,
        message: 'API test successful',
        details: {
          hasApiKey: !!apiKey,
          model: 'sentence-transformers/all-MiniLM-L6-v2',
          embeddingDimension: Array.isArray(embedding) ? embedding.length : 0,
          statusCode: response.status
        }
      });
    } catch (error) {
      this.results.push({
        service: 'HuggingFace API',
        passed: false,
        message: 'API test failed',
        error: error.message
      });
    }
  }

  /**
   * Test security configuration
   */
  async testSecurityConfiguration() {
    console.log('Testing security configuration...');
    
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
        service: 'Security Configuration',
        passed,
        message: passed ? 'Security configuration valid' : `Missing security variables: ${missingSecurityVars.join(', ')}`,
        details: {
          ...securityConfig,
          missingVars: missingSecurityVars,
          rateLimit: {
            windowMs: process.env.RATE_LIMIT_WINDOW_MS || '900000',
            maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS || '50'
          },
          medicalFeatures: {
            disclaimerEnabled: process.env.MEDICAL_DISCLAIMER_ENABLED === 'true',
            clinicalValidation: process.env.CLINICAL_VALIDATION_REQUIRED === 'true',
            emergencyProtocol: process.env.EMERGENCY_PROTOCOL_ENABLED === 'true'
          }
        }
      });
    } catch (error) {
      this.results.push({
        service: 'Security Configuration',
        passed: false,
        message: 'Security test failed',
        error: error.message
      });
    }
  }

  /**
   * Generate test summary
   */
  generateSummary(passed, failed, total) {
    const passRate = ((passed / total) * 100).toFixed(1);
    
    let summary = `🔍 NelsonGPT API Test Results\n`;
    summary += `${'='.repeat(50)}\n`;
    summary += `Total Tests: ${total}\n`;
    summary += `✅ Passed: ${passed}\n`;
    summary += `❌ Failed: ${failed}\n`;
    summary += `📊 Pass Rate: ${passRate}%\n\n`;
    
    if (failed === 0) {
      summary += `🎉 All API tests passed! Your NelsonGPT backend APIs are working correctly.\n`;
    } else {
      summary += `⚠️  Some API tests failed. Please check the detailed results below.\n`;
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
        summary += `   Details:\n`;
        Object.entries(result.details).forEach(([key, value]) => {
          summary += `     ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}\n`;
        });
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
            recommendations.push('Ensure your Supabase project is active and accessible');
            break;
          case 'Mistral AI API':
            recommendations.push('Verify Mistral API key is valid and has sufficient credits');
            recommendations.push('Check if your IP is allowed to access Mistral API');
            break;
          case 'Gemini AI API':
            recommendations.push('Verify Gemini API key is valid and quota is not exceeded');
            recommendations.push('Ensure Gemini API is enabled in your Google Cloud project');
            break;
          case 'HuggingFace API':
            recommendations.push('Verify HuggingFace API key is valid');
            recommendations.push('Check if the model is available and not rate-limited');
            break;
          case 'Security Configuration':
            recommendations.push('Configure missing environment variables for security and HIPAA compliance');
            recommendations.push('Generate proper encryption keys using OpenSSL');
            break;
        }
      }
    });
    
    if (recommendations.length === 0) {
      recommendations.push('All tests passed! Your NelsonGPT backend is ready for development and testing.');
      recommendations.push('Next steps: Build and deploy your application using "npm run build"');
      recommendations.push('For production: Ensure all security settings are properly configured');
    }
    
    return recommendations;
  }
}

// Create and run tests
async function main() {
  const tester = new NelsonGPTAPITester();
  
  try {
    const results = await tester.runAllTests();
    console.log(results.summary);
    
    const recommendations = tester.getRecommendations();
    console.log('\n🔧 Recommendations:');
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
    
    console.log('\n📊 Test Summary:');
    console.log(`- Environment: ${results.passed > 0 ? 'Configured' : 'Needs Setup'}`);
    console.log(`- APIs: ${results.results.filter(r => r.service.includes('API') && r.passed).length}/${results.results.filter(r => r.service.includes('API')).length} working`);
    console.log(`- Security: ${results.results.find(r => r.service === 'Security Configuration')?.passed ? 'Configured' : 'Needs Setup'}`);
    
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

module.exports = { NelsonGPTAPITester };