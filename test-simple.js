#!/usr/bin/env node

// Load environment variables first
require('dotenv').config();

// Simple test using built-in modules
const https = require('https');
const http = require('http');
const fs = require('fs');

class SimpleAPITester {
  constructor() {
    this.results = [];
  }

  /**
   * Make an HTTP/HTTPS request
   */
  makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol === 'https:' ? https : http;
      
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: options.headers || {}
      };

      const req = protocol.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode,
              data: data,
              headers: res.headers
            });
          } catch (error) {
            resolve({
              statusCode: res.statusCode,
              data: data,
              headers: res.headers
            });
          }
        });
      });

      req.on('error', reject);
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🔍 Starting Simple NelsonGPT API Tests...');
    
    // Check environment
    this.testEnvironmentVariables();
    await this.testSupabaseConnection();
    await this.testMistralAPI();
    await this.testGeminiAPI();
    await this.testHuggingFaceAPI();
    this.testSecurityConfiguration();
    
    // Calculate results
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const totalTests = this.results.length;
    
    this.displayResults(passed, failed, totalTests);
    
    return { totalTests, passed, failed, results: this.results };
  }

  /**
   * Test environment variables
   */
  testEnvironmentVariables() {
    console.log('📋 Testing environment variables...');
    
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_KEY', 
      'MISTRAL_API_KEY',
      'GEMINI_API_KEY',
      'HUGGINGFACE_API_KEY'
    ];

    const present = {};
    const missing = [];

    requiredVars.forEach(varName => {
      if (process.env[varName]) {
        present[varName] = '✓ Present';
      } else {
        missing.push(varName);
      }
    });

    const passed = missing.length === 0;

    console.log('Environment Variables Status:');
    Object.entries(present).forEach(([key, status]) => {
      console.log(`  ${key}: ${status}`);
    });
    
    if (missing.length > 0) {
      console.log('Missing Variables:');
      missing.forEach(varName => {
        console.log(`  ${varName}: ❌ Missing`);
      });
    }

    this.results.push({
      service: 'Environment Variables',
      passed,
      message: passed ? 'All required variables present' : `Missing: ${missing.join(', ')}`,
      details: { present: Object.keys(present).length, missing: missing.length }
    });
  }

  /**
   * Test Supabase connection
   */
  async testSupabaseConnection() {
    console.log('🗄️  Testing Supabase connection...');
    
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_KEY;
      
      if (!url || !key) {
        throw new Error('Missing Supabase credentials');
      }

      const response = await this.makeRequest(`${url}/rest/v1/`, {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`
        }
      });

      const passed = response.statusCode === 200 || response.statusCode === 404;
      
      console.log(`  Status: ${response.statusCode} ${passed ? '✅' : '❌'}`);
      
      this.results.push({
        service: 'Supabase Database',
        passed,
        message: passed ? 'Connection successful' : `Connection failed (${response.statusCode})`,
        details: { statusCode: response.statusCode, url: url.substring(0, 30) + '...' }
      });
    } catch (error) {
      console.log(`  Error: ${error.message} ❌`);
      this.results.push({
        service: 'Supabase Database',
        passed: false,
        message: 'Connection failed',
        error: error.message
      });
    }
  }

  /**
   * Test Mistral API
   */
  async testMistralAPI() {
    console.log('🤖 Testing Mistral AI API...');
    
    try {
      const apiKey = process.env.MISTRAL_API_KEY;
      
      if (!apiKey) {
        throw new Error('Missing Mistral API key');
      }

      const response = await this.makeRequest('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'mistral-tiny',
          messages: [{ role: 'user', content: 'Test' }],
          max_tokens: 5
        })
      });

      const passed = response.statusCode === 200;
      console.log(`  Status: ${response.statusCode} ${passed ? '✅' : '❌'}`);
      
      if (passed) {
        const data = JSON.parse(response.data);
        console.log(`  Response received: ${!!data.choices?.[0]?.message?.content ? '✅' : '❌'}`);
      }

      this.results.push({
        service: 'Mistral AI API',
        passed,
        message: passed ? 'API working correctly' : `API failed (${response.statusCode})`,
        details: { statusCode: response.statusCode, hasApiKey: !!apiKey }
      });
    } catch (error) {
      console.log(`  Error: ${error.message} ❌`);
      this.results.push({
        service: 'Mistral AI API',
        passed: false,
        message: 'API test failed',
        error: error.message
      });
    }
  }

  /**
   * Test Gemini API
   */
  async testGeminiAPI() {
    console.log('💎 Testing Gemini AI API...');
    
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error('Missing Gemini API key');
      }

      const response = await this.makeRequest(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: 'Test' }]
          }]
        })
      });

      const passed = response.statusCode === 200;
      console.log(`  Status: ${response.statusCode} ${passed ? '✅' : '❌'}`);
      
      if (passed) {
        const data = JSON.parse(response.data);
        console.log(`  Response received: ${!!data.candidates?.[0]?.content ? '✅' : '❌'}`);
      }

      this.results.push({
        service: 'Gemini AI API',
        passed,
        message: passed ? 'API working correctly' : `API failed (${response.statusCode})`,
        details: { statusCode: response.statusCode, hasApiKey: !!apiKey }
      });
    } catch (error) {
      console.log(`  Error: ${error.message} ❌`);
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
    console.log('🤗 Testing HuggingFace API...');
    
    try {
      const apiKey = process.env.HUGGINGFACE_API_KEY;
      
      if (!apiKey) {
        throw new Error('Missing HuggingFace API key');
      }

      const response = await this.makeRequest('https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: "Test sentence"
        })
      });

      const passed = response.statusCode === 200;
      console.log(`  Status: ${response.statusCode} ${passed ? '✅' : '❌'}`);
      
      if (passed) {
        const data = JSON.parse(response.data);
        console.log(`  Embedding dimension: ${Array.isArray(data) ? data.length : 'N/A'}`);
      }

      this.results.push({
        service: 'HuggingFace API',
        passed,
        message: passed ? 'API working correctly' : `API failed (${response.statusCode})`,
        details: { statusCode: response.statusCode, hasApiKey: !!apiKey }
      });
    } catch (error) {
      console.log(`  Error: ${error.message} ❌`);
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
  testSecurityConfiguration() {
    console.log('🔐 Testing security configuration...');
    
    const securityVars = [
      'NEXTAUTH_SECRET',
      'ENCRYPTION_KEY'
    ];

    const configured = {};
    const missing = [];

    securityVars.forEach(varName => {
      if (process.env[varName]) {
        configured[varName] = '✓ Configured';
      } else {
        missing.push(varName);
      }
    });

    // Check other security features
    const features = {
      'Security Headers': process.env.SECURITY_HEADERS_ENABLED === 'true',
      'Audit Logging': process.env.AUDIT_LOGGING_ENABLED === 'true',
      'PHI Detection': process.env.PHI_DETECTION_ENABLED === 'true',
      'Medical Disclaimer': process.env.MEDICAL_DISCLAIMER_ENABLED === 'true',
      'Clinical Validation': process.env.CLINICAL_VALIDATION_REQUIRED === 'true'
    };

    console.log('Security Configuration:');
    Object.entries(configured).forEach(([key, status]) => {
      console.log(`  ${key}: ${status}`);
    });
    
    console.log('Security Features:');
    Object.entries(features).forEach(([key, enabled]) => {
      console.log(`  ${key}: ${enabled ? '✅ Enabled' : '❌ Disabled'}`);
    });

    const passed = missing.length === 0;

    this.results.push({
      service: 'Security Configuration',
      passed,
      message: passed ? 'Security properly configured' : `Missing: ${missing.join(', ')}`,
      details: { 
        configured: Object.keys(configured).length, 
        missing: missing.length,
        featuresEnabled: Object.values(features).filter(Boolean).length
      }
    });
  }

  /**
   * Display final results
   */
  displayResults(passed, failed, total) {
    const passRate = ((passed / total) * 100).toFixed(1);
    
    console.log('\n' + '='.repeat(60));
    console.log('🔍 NelsonGPT System Test Results');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Pass Rate: ${passRate}%`);
    console.log('='.repeat(60));
    
    if (failed === 0) {
      console.log('🎉 All tests passed! Your NelsonGPT backend is ready!');
    } else {
      console.log('⚠️  Some tests failed. Check the issues above.');
    }

    console.log('\n📋 Test Summary:');
    this.results.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.service}: ${result.message}`);
    });

    // Provide recommendations
    console.log('\n🔧 Next Steps:');
    if (failed === 0) {
      console.log('1. ✅ All APIs are working correctly');
      console.log('2. 🚀 Ready to build: npm run build');
      console.log('3. 🧪 Run application tests: npm test');
      console.log('4. 🌐 Start development server: npm run dev');
    } else {
      console.log('1. 🔑 Fix any missing API keys in .env file');
      console.log('2. 🌐 Check network connectivity to external APIs');
      console.log('3. 💰 Verify API quotas and billing status');
      console.log('4. 🔐 Complete security configuration');
    }
  }
}

// Run tests
async function main() {
  console.log('Starting NelsonGPT Backend System Tests');
  console.log('=====================================\n');
  
  const tester = new SimpleAPITester();
  
  try {
    const results = await tester.runAllTests();
    process.exit(results.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { SimpleAPITester };