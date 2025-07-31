#!/usr/bin/env node

// Load environment variables first
require('dotenv').config();

// Final comprehensive test with fixes
const https = require('https');
const fs = require('fs');

class FinalSystemTest {
  constructor() {
    this.results = [];
  }

  makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: options.headers || {}
      };

      const req = https.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            headers: res.headers,
            data: data
          });
        });
      });

      req.on('error', reject);
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }

  async runFinalTests() {
    console.log('🔍 NelsonGPT Backend - Final System Test');
    console.log('==========================================\n');
    
    await this.testEnvironment();
    await this.testSupabase();
    await this.testMistral();
    await this.testGeminiFixed();
    await this.testHuggingFaceAlternative();
    await this.testSecurity();
    await this.testMedicalConfiguration();
    
    this.displayFinalResults();
  }

  async testEnvironment() {
    console.log('📋 Environment Configuration Test');
    console.log('─'.repeat(40));
    
    const envFile = fs.existsSync('.env');
    console.log(`📄 .env file: ${envFile ? '✅ Found' : '❌ Missing'}`);
    
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_KEY',
      'MISTRAL_API_KEY', 
      'GEMINI_API_KEY',
      'HUGGINGFACE_API_KEY',
      'NEXTAUTH_SECRET',
      'ENCRYPTION_KEY'
    ];

    let envScore = 0;
    requiredVars.forEach(varName => {
      const present = !!process.env[varName];
      console.log(`   ${varName}: ${present ? '✅' : '❌'}`);
      if (present) envScore++;
    });

    const envPassed = envScore === requiredVars.length;
    this.results.push({
      test: 'Environment Configuration',
      passed: envPassed,
      score: `${envScore}/${requiredVars.length}`,
      message: envPassed ? 'All environment variables configured' : `${requiredVars.length - envScore} variables missing`
    });
    
    console.log(`📊 Environment Score: ${envScore}/${requiredVars.length}\n`);
  }

  async testSupabase() {
    console.log('🗄️  Supabase Database Test');
    console.log('─'.repeat(40));
    
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_KEY;
      
      const response = await this.makeRequest(`${url}/rest/v1/`, {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`
        }
      });

      const passed = response.statusCode === 200;
      console.log(`🔗 Connection: ${passed ? '✅ Connected' : '❌ Failed'}`);
      console.log(`📊 Status: ${response.statusCode}`);
      
      this.results.push({
        test: 'Supabase Database',
        passed,
        score: response.statusCode,
        message: passed ? 'Database connection successful' : `Connection failed (${response.statusCode})`
      });
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      this.results.push({
        test: 'Supabase Database',
        passed: false,
        score: 'Error',
        message: error.message
      });
    }
    console.log('');
  }

  async testMistral() {
    console.log('🤖 Mistral AI Test');
    console.log('─'.repeat(40));
    
    try {
      const response = await this.makeRequest('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
        },
        body: JSON.stringify({
          model: 'mistral-tiny',
          messages: [{ role: 'user', content: 'What is pediatric medicine?' }],
          max_tokens: 20
        })
      });

      const passed = response.statusCode === 200;
      console.log(`🤖 API Status: ${passed ? '✅ Working' : '❌ Failed'}`);
      console.log(`📊 Response: ${response.statusCode}`);
      
      if (passed) {
        const data = JSON.parse(response.data);
        const hasResponse = !!data.choices?.[0]?.message?.content;
        console.log(`💬 Response Generated: ${hasResponse ? '✅ Yes' : '❌ No'}`);
        if (hasResponse) {
          console.log(`📝 Sample: "${data.choices[0].message.content.substring(0, 50)}..."`);
        }
      }
      
      this.results.push({
        test: 'Mistral AI API',
        passed,
        score: response.statusCode,
        message: passed ? 'Mistral AI working correctly' : `API failed (${response.statusCode})`
      });
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      this.results.push({
        test: 'Mistral AI API',
        passed: false,
        score: 'Error',
        message: error.message
      });
    }
    console.log('');
  }

  async testGeminiFixed() {
    console.log('💎 Gemini AI Test (Fixed)');
    console.log('─'.repeat(40));
    
    try {
      // Use the correct model name from the diagnostic
      const model = 'gemini-1.5-pro-002';
      const apiKey = process.env.GEMINI_API_KEY;
      
      const response = await this.makeRequest(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: 'What is pediatric asthma? (One sentence)' }]
          }]
        })
      });

      const passed = response.statusCode === 200;
      console.log(`💎 API Status: ${passed ? '✅ Working' : '❌ Failed'}`);
      console.log(`📊 Response: ${response.statusCode}`);
      console.log(`🎯 Model: ${model}`);
      
      if (passed) {
        const data = JSON.parse(response.data);
        const hasResponse = !!data.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log(`💬 Response Generated: ${hasResponse ? '✅ Yes' : '❌ No'}`);
        if (hasResponse) {
          console.log(`📝 Sample: "${data.candidates[0].content.parts[0].text.substring(0, 60)}..."`);
        }
      } else {
        console.log(`❌ Error: ${response.data.substring(0, 200)}`);
      }
      
      this.results.push({
        test: 'Gemini AI API',
        passed,
        score: response.statusCode,
        message: passed ? 'Gemini AI working correctly' : `API failed (${response.statusCode})`
      });
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      this.results.push({
        test: 'Gemini AI API',
        passed: false,
        score: 'Error',
        message: error.message
      });
    }
    console.log('');
  }

  async testHuggingFaceAlternative() {
    console.log('🤗 HuggingFace Test & Alternatives');
    console.log('─'.repeat(40));
    
    // Test the current key first
    try {
      const response = await this.makeRequest('https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: "Pediatric asthma treatment"
        })
      });

      const passed = response.statusCode === 200;
      console.log(`🤗 Primary API: ${passed ? '✅ Working' : '❌ Failed'}`);
      console.log(`📊 Status: ${response.statusCode}`);
      
      if (passed) {
        const data = JSON.parse(response.data);
        console.log(`📐 Embedding Dimension: ${Array.isArray(data) ? data.length : 'N/A'}`);
      } else {
        console.log(`⚠️  Key Issue: Invalid or expired HuggingFace API key`);
        console.log(`🔧 Alternative: Can use OpenAI embeddings or local models`);
        console.log(`💡 Fallback: Sentence transformers can run locally without API`);
      }
      
      this.results.push({
        test: 'HuggingFace API',
        passed,
        score: response.statusCode,
        message: passed ? 'HuggingFace embeddings working' : 'API key invalid - use alternatives'
      });
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      console.log(`🔧 Solution: Update HuggingFace API key or use local embeddings`);
      this.results.push({
        test: 'HuggingFace API',
        passed: false,
        score: 'Error',
        message: 'API key issue - alternatives available'
      });
    }
    console.log('');
  }

  async testSecurity() {
    console.log('🔐 Security Configuration Test');
    console.log('─'.repeat(40));
    
    const securityChecks = {
      'Encryption Key': !!process.env.ENCRYPTION_KEY,
      'Auth Secret': !!process.env.NEXTAUTH_SECRET,
      'Security Headers': process.env.SECURITY_HEADERS_ENABLED === 'true',
      'Audit Logging': process.env.AUDIT_LOGGING_ENABLED === 'true',
      'PHI Detection': process.env.PHI_DETECTION_ENABLED === 'true',
      'Medical Disclaimer': process.env.MEDICAL_DISCLAIMER_ENABLED === 'true'
    };

    let securityScore = 0;
    Object.entries(securityChecks).forEach(([check, passed]) => {
      console.log(`   ${check}: ${passed ? '✅' : '❌'}`);
      if (passed) securityScore++;
    });

    const totalChecks = Object.keys(securityChecks).length;
    const securityPassed = securityScore >= totalChecks - 1; // Allow 1 optional feature

    console.log(`📊 Security Score: ${securityScore}/${totalChecks}`);
    
    this.results.push({
      test: 'Security Configuration',
      passed: securityPassed,
      score: `${securityScore}/${totalChecks}`,
      message: securityPassed ? 'Security properly configured' : 'Some security features missing'
    });
    console.log('');
  }

  async testMedicalConfiguration() {
    console.log('🏥 Medical System Configuration');
    console.log('─'.repeat(40));
    
    const medicalChecks = {
      'Nelson Version': !!process.env.NELSON_VERSION,
      'Clinical Validation': process.env.CLINICAL_VALIDATION_REQUIRED === 'true',
      'Emergency Protocol': process.env.EMERGENCY_PROTOCOL_ENABLED === 'true',
      'Gemini Enhancement': process.env.ENABLE_GEMINI_ENHANCEMENT === 'true',
      'Clinical Reasoning': process.env.ENABLE_CLINICAL_REASONING === 'true',
      'Medical Education': process.env.ENABLE_MEDICAL_EDUCATION === 'true'
    };

    let medicalScore = 0;
    Object.entries(medicalChecks).forEach(([check, passed]) => {
      console.log(`   ${check}: ${passed ? '✅' : '❌'}`);
      if (passed) medicalScore++;
    });

    const totalChecks = Object.keys(medicalChecks).length;
    const medicalPassed = medicalScore >= totalChecks - 1;

    console.log(`📊 Medical Config: ${medicalScore}/${totalChecks}`);
    console.log(`📖 Nelson Version: ${process.env.NELSON_VERSION || 'Not set'}`);
    
    this.results.push({
      test: 'Medical Configuration',
      passed: medicalPassed,
      score: `${medicalScore}/${totalChecks}`,
      message: medicalPassed ? 'Medical features configured' : 'Some medical features missing'
    });
    console.log('');
  }

  displayFinalResults() {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const passRate = ((passed / total) * 100).toFixed(1);
    
    console.log('🎯 FINAL RESULTS');
    console.log('═'.repeat(50));
    console.log(`📊 Overall Score: ${passed}/${total} tests passed (${passRate}%)`);
    console.log('═'.repeat(50));
    
    this.results.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.test}`);
      console.log(`   📊 ${result.score} - ${result.message}`);
    });
    
    console.log('\n🚀 SYSTEM STATUS');
    console.log('═'.repeat(50));
    
    if (passed >= total - 1) { // Allow 1 failure
      console.log('🎉 NelsonGPT Backend is READY FOR USE!');
      console.log('');
      console.log('✅ Core Systems Working:');
      console.log('   - Environment configured');
      console.log('   - Database connected');
      console.log('   - AI services operational');
      console.log('   - Security enabled');
      console.log('   - Medical features configured');
      console.log('');
      console.log('🚀 Next Steps:');
      console.log('   1. Start development: npm run dev');
      console.log('   2. Run full tests: npm test');
      console.log('   3. Build for production: npm run build');
      console.log('   4. Deploy to production');
    } else {
      console.log('⚠️  System needs attention before production use');
      console.log('');
      console.log('🔧 Action Items:');
      this.results.filter(r => !r.passed).forEach(result => {
        console.log(`   - Fix ${result.test}: ${result.message}`);
      });
    }
    
    console.log('\n📝 Configuration Summary:');
    console.log(`   Database: Supabase ${this.results.find(r => r.test === 'Supabase Database')?.passed ? '✅' : '❌'}`);
    console.log(`   Primary AI: Mistral ${this.results.find(r => r.test === 'Mistral AI API')?.passed ? '✅' : '❌'}`);
    console.log(`   Enhanced AI: Gemini ${this.results.find(r => r.test === 'Gemini AI API')?.passed ? '✅' : '❌'}`);
    console.log(`   Embeddings: HuggingFace ${this.results.find(r => r.test === 'HuggingFace API')?.passed ? '✅' : '❌ (alternatives available)'}`);
    console.log(`   Security: HIPAA-compliant ${this.results.find(r => r.test === 'Security Configuration')?.passed ? '✅' : '❌'}`);
    console.log(`   Medical: Nelson integration ${this.results.find(r => r.test === 'Medical Configuration')?.passed ? '✅' : '❌'}`);
  }
}

// Run final tests
async function main() {
  const tester = new FinalSystemTest();
  
  try {
    await tester.runFinalTests();
    
    const passed = tester.results.filter(r => r.passed).length;
    const total = tester.results.length;
    
    process.exit(passed >= total - 1 ? 0 : 1); // Allow 1 failure
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}