#!/usr/bin/env node

// Load environment variables first
require('dotenv').config();

// Diagnostic test for failing APIs
const https = require('https');

class APIDiagnostic {
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

  async diagnoseGemini() {
    console.log('🔍 Diagnosing Gemini API...');
    
    const apiKey = process.env.GEMINI_API_KEY;
    console.log(`API Key present: ${!!apiKey}`);
    console.log(`API Key format: ${apiKey ? apiKey.substring(0, 10) + '...' : 'N/A'}`);
    
    // Test different endpoints
    const endpoints = [
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
    ];

    for (const [index, endpoint] of endpoints.entries()) {
      console.log(`\nTesting endpoint ${index + 1}:`);
      console.log(`URL: ${endpoint.substring(0, 80)}...`);
      
      try {
        // First test with GET to check if endpoint exists
        const getResponse = await this.makeRequest(endpoint, {
          method: 'GET'
        });
        
        console.log(`GET Response: ${getResponse.statusCode} ${getResponse.statusMessage}`);
        
        if (getResponse.statusCode === 200) {
          console.log('✅ Endpoint accessible');
          console.log('Response preview:', getResponse.data.substring(0, 200) + '...');
        } else if (getResponse.statusCode === 404) {
          console.log('❌ Endpoint not found');
        } else if (getResponse.statusCode === 403) {
          console.log('❌ Access forbidden - check API key permissions');
        } else {
          console.log('⚠️  Unexpected status');
          console.log('Response:', getResponse.data.substring(0, 300));
        }
        
        // If this is the generateContent endpoint, test POST
        if (endpoint.includes('generateContent')) {
          const postResponse = await this.makeRequest(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: 'Hello' }]
              }]
            })
          });
          
          console.log(`POST Response: ${postResponse.statusCode} ${postResponse.statusMessage}`);
          if (postResponse.statusCode === 200) {
            console.log('✅ POST request successful');
          } else {
            console.log('❌ POST request failed');
            console.log('Error response:', postResponse.data.substring(0, 300));
          }
        }
        
      } catch (error) {
        console.log(`❌ Request failed: ${error.message}`);
      }
    }
  }

  async diagnoseHuggingFace() {
    console.log('\n🔍 Diagnosing HuggingFace API...');
    
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    console.log(`API Key present: ${!!apiKey}`);
    console.log(`API Key format: ${apiKey ? apiKey.substring(0, 15) + '...' : 'N/A'}`);
    
    // Test authentication first
    try {
      const authResponse = await this.makeRequest('https://huggingface.co/api/whoami', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      console.log(`Auth test: ${authResponse.statusCode} ${authResponse.statusMessage}`);
      if (authResponse.statusCode === 200) {
        console.log('✅ Authentication successful');
        console.log('User info:', authResponse.data);
      } else {
        console.log('❌ Authentication failed');
        console.log('Response:', authResponse.data);
      }
    } catch (error) {
      console.log(`❌ Auth test failed: ${error.message}`);
    }

    // Test different models
    const models = [
      'sentence-transformers/all-MiniLM-L6-v2',
      'microsoft/DialoGPT-medium',
      'bert-base-uncased'
    ];

    for (const model of models) {
      console.log(`\nTesting model: ${model}`);
      
      try {
        const response = await this.makeRequest(`https://api-inference.huggingface.co/pipeline/feature-extraction/${model}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: "Hello world"
          })
        });
        
        console.log(`Response: ${response.statusCode} ${response.statusMessage}`);
        
        if (response.statusCode === 200) {
          console.log('✅ Model working');
          const data = JSON.parse(response.data);
          if (Array.isArray(data)) {
            console.log(`Embedding dimension: ${data.length}`);
          }
        } else if (response.statusCode === 503) {
          console.log('⏳ Model loading (503 - this is normal for first request)');
        } else if (response.statusCode === 401) {
          console.log('❌ Authentication failed');
        } else {
          console.log('⚠️  Unexpected response');
          console.log('Response body:', response.data.substring(0, 300));
        }
        
      } catch (error) {
        console.log(`❌ Request failed: ${error.message}`);
      }
    }
  }

  async runDiagnostics() {
    console.log('🔍 Running API Diagnostics\n');
    
    await this.diagnoseGemini();
    await this.diagnoseHuggingFace();
    
    console.log('\n📋 Diagnostic Summary:');
    console.log('1. If Gemini shows 404: The API endpoint might have changed or the API key lacks permissions');
    console.log('2. If HuggingFace shows 401: The API key might be invalid or expired');
    console.log('3. If HuggingFace shows 503: The model is loading (wait and retry)');
    console.log('4. Check your API key validity and quotas in the respective dashboards');
  }
}

// Run diagnostics
async function main() {
  const diagnostic = new APIDiagnostic();
  await diagnostic.runDiagnostics();
}

if (require.main === module) {
  main().catch(console.error);
}