# 🔗 NelsonGPT API Documentation

## Overview
NelsonGPT provides RESTful APIs for medical AI assistance, clinical decision support, and pediatric healthcare information retrieval.

**Base URL**: `https://your-domain.com/api`  
**Authentication**: Bearer token (where required)  
**Content Type**: `application/json`

## 🧠 Core AI Endpoints

### Chat with RAG Pipeline
Primary endpoint for medical consultations with retrieval-augmented generation.

```http
POST /api/rag/chat
```

**Request Body:**
```json
{
  "query": "What are the treatment options for pediatric asthma?",
  "sessionId": "session-uuid",
  "chatHistory": [
    {
      "role": "user",
      "content": "Previous message"
    }
  ],
  "enhancementOptions": {
    "enableGemini": true,
    "enhancementType": "clinical_reasoning",
    "targetAudience": "clinicians"
  }
}
```

**Response:**
```json
{
  "query": "What are the treatment options for pediatric asthma?",
  "response": "Based on current pediatric guidelines...",
  "sources": [
    "Nelson Textbook of Pediatrics - Chapter 45: Asthma",
    "AAP Guidelines for Asthma Management"
  ],
  "confidence": 0.92,
  "processingTime": 1250,
  "metadata": {
    "documentCount": 5,
    "totalTokens": 2048,
    "mistralUsage": {
      "prompt_tokens": 1024,
      "completion_tokens": 512,
      "total_tokens": 1536
    },
    "enhancementApplied": true
  }
}
```

## 🩺 Clinical Tools API

### Differential Diagnosis
Generate AI-powered differential diagnosis based on symptoms.

```http
POST /api/rag/clinical/diagnosis
```

**Request Body:**
```json
{
  "symptoms": ["fever", "cough", "wheezing"],
  "patientAge": "5 years",
  "patientGender": "male",
  "useGemini": true
}
```

**Response:**
```json
{
  "diagnosis": "## Differential Diagnosis\n\n### Most Likely Diagnoses\n1. **Viral Bronchiolitis** (High probability)\n2. **Asthma Exacerbation** (Moderate probability)\n3. **Pneumonia** (Consider, especially bacterial)\n\n### Clinical Reasoning\n...",
  "confidence": 0.88,
  "sources": ["Nelson Textbook - Respiratory Diseases"],
  "processingTime": 890
}
```

### Treatment Recommendations
Generate evidence-based treatment recommendations.

```http
POST /api/rag/clinical/treatment
```

**Request Body:**
```json
{
  "condition": "pediatric pneumonia",
  "patientAge": "3 years",
  "patientWeight": "15 kg",
  "allergies": ["penicillin"],
  "severity": "moderate",
  "useGemini": true
}
```

**Response:**
```json
{
  "treatment": "## Treatment Recommendations\n\n### First-Line Therapy\n- **Amoxicillin-Clavulanate**: 45 mg/kg/day divided BID\n- Duration: 7-10 days\n\n### Alternative (Penicillin Allergy)\n- **Cefdinir**: 14 mg/kg/day divided BID\n\n### Monitoring\n...",
  "confidence": 0.91,
  "sources": ["Nelson Textbook - Infectious Diseases"],
  "processingTime": 1120
}
```

## 📚 Medical Education API

### Educational Content Generation
Generate medical education content for various audiences.

```http
POST /api/rag/education
```

**Request Body:**
```json
{
  "topic": "Pediatric Cardiology Basics",
  "difficultyLevel": "intermediate",
  "contentType": "overview",
  "targetAudience": "medical_students"
}
```

**Response:**
```json
{
  "content": "# Pediatric Cardiology Basics\n\n## Learning Objectives\n1. Understand normal pediatric cardiac development\n2. Recognize common congenital heart defects...",
  "metadata": {
    "wordCount": 1250,
    "readingTime": "5 minutes",
    "difficulty": "intermediate"
  },
  "sources": ["Nelson Textbook - Cardiovascular System"]
}
```

## 💬 Chat Management API

### Get Chat Sessions
Retrieve user's chat sessions.

```http
GET /api/chat/sessions
```

**Query Parameters:**
- `limit`: Number of sessions (default: 20)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "sessions": [
    {
      "id": "session-uuid",
      "title": "Fever in Infants Discussion",
      "createdAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-01-01T10:30:00Z",
      "messageCount": 8
    }
  ],
  "total": 45,
  "hasMore": true
}
```

### Get Session Messages
Retrieve messages from a specific session.

```http
GET /api/chat/session/{sessionId}
```

**Response:**
```json
{
  "session": {
    "id": "session-uuid",
    "title": "Fever in Infants Discussion",
    "messages": [
      {
        "id": "msg-uuid",
        "role": "user",
        "content": "What temperature constitutes fever in infants?",
        "timestamp": "2024-01-01T10:00:00Z"
      },
      {
        "id": "msg-uuid-2",
        "role": "assistant",
        "content": "Fever in infants is defined as...",
        "timestamp": "2024-01-01T10:00:15Z",
        "sources": ["Nelson Textbook - Fever and Temperature"]
      }
    ]
  }
}
```

### Store Chat Message
Store a new message in a session.

```http
POST /api/chat/messages
```

**Request Body:**
```json
{
  "sessionId": "session-uuid",
  "role": "user",
  "content": "What are the signs of dehydration in children?",
  "metadata": {
    "clientTimestamp": "2024-01-01T10:00:00Z"
  }
}
```

## 🔍 System Health & Monitoring

### Health Check
Check system and service health.

```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T10:00:00Z",
  "services": {
    "supabase": {
      "success": true,
      "responseTime": "15ms",
      "message": "Database connection healthy"
    },
    "mistral": {
      "success": true,
      "responseTime": "200ms",
      "message": "Mistral API operational"
    },
    "gemini": {
      "success": true,
      "responseTime": "150ms",
      "message": "Gemini API operational"
    },
    "embeddings": {
      "success": true,
      "responseTime": "100ms",
      "message": "Embedding service operational"
    }
  },
  "performance": {
    "memoryUsage": "45%",
    "responseTime": "average_120ms"
  }
}
```

## 🔒 Authentication & Authorization

### API Key Authentication
For programmatic access, include API key in headers:

```http
Authorization: Bearer your-api-key
X-API-Version: 1.0
```

### Session-Based Authentication
For web interface, use session cookies from NextAuth.

### Rate Limiting
- **Standard**: 100 requests per 15 minutes
- **Medical Professional**: 500 requests per 15 minutes
- **Enterprise**: Custom limits

Rate limit headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## ⚠️ Error Handling

### Standard Error Response
```json
{
  "error": "Invalid request parameters",
  "code": "INVALID_PARAMS",
  "details": {
    "field": "patientAge",
    "message": "Age must be specified for pediatric calculations"
  },
  "timestamp": "2024-01-01T10:00:00Z",
  "requestId": "req-uuid"
}
```

### Error Codes
- `400` - Bad Request (Invalid parameters)
- `401` - Unauthorized (Invalid API key)
- `403` - Forbidden (Insufficient permissions)
- `429` - Too Many Requests (Rate limit exceeded)
- `500` - Internal Server Error
- `503` - Service Unavailable (AI services down)

## 📊 Usage Examples

### JavaScript/TypeScript
```typescript
interface ChatRequest {
  query: string;
  sessionId?: string;
  enhancementOptions?: {
    enableGemini?: boolean;
    enhancementType?: 'clinical_reasoning' | 'simplification';
    targetAudience?: 'clinicians' | 'students';
  };
}

async function askNelsonGPT(request: ChatRequest) {
  const response = await fetch('/api/rag/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}
```

### Python
```python
import requests

def query_nelsongpt(query: str, session_id: str = None):
    url = "https://your-domain.com/api/rag/chat"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    
    payload = {
        "query": query,
        "sessionId": session_id,
        "enhancementOptions": {
            "enableGemini": True,
            "enhancementType": "clinical_reasoning"
        }
    }
    
    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    
    return response.json()
```

### cURL
```bash
curl -X POST "https://your-domain.com/api/rag/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "query": "What is the appropriate dose of acetaminophen for a 20kg child?",
    "enhancementOptions": {
      "enableGemini": true,
      "enhancementType": "clinical_reasoning"
    }
  }'
```

## 🏥 Clinical Integration

### EMR Integration Example
```javascript
// Integration with Epic, Cerner, or other EMR systems
class EMRIntegration {
  async getPatientContext(patientId) {
    // Fetch relevant patient data (with proper authorization)
    const patient = await emr.getPatient(patientId);
    
    return {
      age: patient.age,
      weight: patient.weight,
      allergies: patient.allergies,
      currentMedications: patient.medications
    };
  }

  async queryWithPatientContext(query, patientId) {
    const context = await this.getPatientContext(patientId);
    
    return askNelsonGPT({
      query: `${query} (Patient: ${context.age} old, ${context.weight}kg, allergies: ${context.allergies.join(', ')})`,
      enhancementOptions: {
        enableGemini: true,
        targetAudience: 'clinicians'
      }
    });
  }
}
```

## 🔐 Security Considerations

### Data Protection
- All requests use HTTPS encryption
- Medical data is never logged or cached
- Sessions expire after inactivity
- API keys have configurable scopes

### Compliance
- HIPAA-compliant audit logging
- No PHI stored without consent
- Encrypted data transmission
- Regular security audits

---

For technical support or API access requests, contact: api-support@nelsongpt.medical