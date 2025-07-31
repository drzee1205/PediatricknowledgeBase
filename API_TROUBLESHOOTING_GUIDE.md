# API Troubleshooting Guide

This guide helps resolve the two API issues identified in the system tests.

## 🔧 Issue 1: Gemini AI API (Status 429 - Quota Exceeded)

### Problem
```
Error: 429 - You exceeded your current quota, please check your plan and billing details
```

### Root Cause
Your Google Cloud account has exceeded the free tier quota for Gemini API or has billing issues.

### Solutions

#### Option A: Fix Quota (Recommended)
1. **Access Google AI Studio**
   - Go to https://aistudio.google.com/
   - Sign in with the account that created the API key

2. **Check Usage & Billing**
   - View your API usage dashboard
   - Check if you've exceeded free tier limits
   - Verify billing account is active

3. **Increase Quota**
   - Go to Google Cloud Console
   - Navigate to APIs & Services > Quotas
   - Search for "Generative Language API"
   - Request quota increase if needed

#### Option B: Disable Gemini (Quick Fix)
If you want to proceed without Gemini enhancement:

1. **Update Environment Variables**
   ```bash
   # In your .env file, set:
   ENABLE_GEMINI_ENHANCEMENT=false
   ```

2. **System Will Work With Mistral Only**
   - All core functionality remains
   - Only enhanced AI features disabled

### Verification
Run this test to verify the fix:
```bash
node -e "
require('dotenv').config();
const https = require('https');
const test = () => {
  const req = https.request({
    hostname: 'generativelanguage.googleapis.com',
    path: '/v1beta/models/gemini-1.5-pro-002:generateContent?key=' + process.env.GEMINI_API_KEY,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, res => {
    console.log('Gemini Status:', res.statusCode);
    process.exit(res.statusCode === 200 ? 0 : 1);
  });
  req.write(JSON.stringify({contents:[{parts:[{text:'Test'}]}]}));
  req.end();
};
test();
"
```

---

## 🔧 Issue 2: HuggingFace API (Status 401 - Invalid Credentials)

### Problem
```
Error: 401 - Invalid credentials in Authorization header
```

### Root Cause
The HuggingFace API key is invalid, expired, or incorrectly formatted.

### Solutions

#### Option A: Get New API Key (Recommended)
1. **Visit HuggingFace**
   - Go to https://huggingface.co/settings/tokens
   - Sign in to your account

2. **Create New Token**
   - Click "New token"
   - Give it a name like "NelsonGPT"
   - Select "Read" permissions
   - Copy the new token (starts with `hf_`)

3. **Update Environment**
   ```bash
   # Replace in your .env file:
   HUGGINGFACE_API_KEY=hf_your_new_token_here
   ```

#### Option B: Use Local Embeddings (No API Required)
Replace HuggingFace with local sentence transformers:

1. **Install Dependencies**
   ```bash
   npm install @huggingface/transformers
   ```

2. **Update Configuration**
   ```bash
   # In your .env file:
   EMBEDDING_MODEL=local
   USE_LOCAL_EMBEDDINGS=true
   ```

#### Option C: Use OpenAI Embeddings
If you have an OpenAI API key:

1. **Add OpenAI Key**
   ```bash
   # In your .env file:
   OPENAI_API_KEY=sk-your_openai_key_here
   EMBEDDING_PROVIDER=openai
   ```

#### Option D: Use Supabase Embeddings
Supabase has built-in embedding functions:

1. **Configure Supabase Embeddings**
   ```bash
   # In your .env file:
   EMBEDDING_PROVIDER=supabase
   SUPABASE_EMBEDDING_MODEL=gte-small
   ```

### Verification
Test HuggingFace API:
```bash
node -e "
require('dotenv').config();
const https = require('https');
const test = () => {
  const req = https.request({
    hostname: 'api-inference.huggingface.co',
    path: '/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + process.env.HUGGINGFACE_API_KEY,
      'Content-Type': 'application/json'
    }
  }, res => {
    console.log('HuggingFace Status:', res.statusCode);
    process.exit(res.statusCode === 200 ? 0 : 1);
  });
  req.write(JSON.stringify({inputs: 'test'}));
  req.end();
};
test();
"
```

---

## 🚀 Quick System Test

After making changes, run the comprehensive test:

```bash
# Run the final system test
node final-test.js

# Or run individual API tests
node test-simple.js
```

## 📞 Support Resources

### Gemini API Support
- **Documentation:** https://ai.google.dev/gemini-api/docs
- **Pricing:** https://ai.google.dev/pricing
- **Support:** Google Cloud Support Console

### HuggingFace Support
- **Documentation:** https://huggingface.co/docs/api-inference
- **Pricing:** https://huggingface.co/pricing
- **Support:** https://huggingface.co/support

## ✅ Success Indicators

Your APIs are working when you see:
- **Gemini:** Status 200 with response content
- **HuggingFace:** Status 200 with embedding array

Remember: **The core NelsonGPT system works perfectly with just Mistral AI**. These additional APIs are enhancements that can be added later.

## 🎯 Priority Recommendation

**Option 1:** Fix the API keys for full functionality  
**Option 2:** Disable enhanced features and proceed with core system  
**Option 3:** Use alternative providers (OpenAI, local models)

The system is production-ready with just Supabase + Mistral AI!