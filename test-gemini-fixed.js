#!/usr/bin/env node

// Test Gemini API with corrected model name
require('dotenv').config();
const https = require('https');

async function testGemini() {
  console.log('🧪 Testing Gemini API with Correct Model');
  console.log('==========================================');
  
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-pro-002';
  
  console.log(`🔑 API Key: ${apiKey ? apiKey.substring(0, 15) + '...' : 'Missing'}`);
  console.log(`🤖 Model: ${model}`);
  
  const testEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  return new Promise((resolve, reject) => {
    const requestData = JSON.stringify({
      contents: [{
        parts: [{ 
          text: 'What is pediatric asthma? Provide a brief medical definition in one sentence.' 
        }]
      }]
    });

    const urlObj = new URL(testEndpoint);
    
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`📊 Response Status: ${res.statusCode} ${res.statusMessage}`);
        
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            const content = response.candidates?.[0]?.content?.parts?.[0]?.text;
            
            console.log('✅ Gemini API Working!');
            console.log(`💬 Response: "${content ? content.substring(0, 100) + '...' : 'No content'}"`);
            console.log(`📝 Full Response Available: ${!!content}`);
            
            resolve({
              success: true,
              statusCode: res.statusCode,
              content: content
            });
          } catch (error) {
            console.log(`❌ JSON Parse Error: ${error.message}`);
            resolve({ success: false, error: error.message });
          }
        } else {
          console.log(`❌ API Error: ${res.statusCode}`);
          console.log(`📋 Error Details: ${data.substring(0, 300)}`);
          resolve({
            success: false,
            statusCode: res.statusCode,
            error: data
          });
        }
      });
    });

    req.on('error', (error) => {
      console.log(`❌ Request Error: ${error.message}`);
      reject(error);
    });

    req.write(requestData);
    req.end();
  });
}

// Run test
testGemini().then(result => {
  console.log('\n🎯 Test Summary:');
  console.log(`✅ Gemini API: ${result.success ? 'WORKING' : 'FAILED'}`);
  
  if (result.success) {
    console.log('🎉 Gemini is ready for NelsonGPT!');
    process.exit(0);
  } else {
    console.log('⚠️  Gemini needs attention, but NelsonGPT will work with Mistral AI');
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});