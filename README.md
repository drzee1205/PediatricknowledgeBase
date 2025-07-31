# 🏥 NelsonGPT - AI-Powered Pediatric Medical Assistant

NelsonGPT is a sophisticated AI-powered medical assistant specifically designed for pediatric healthcare professionals. Built on the foundation of the Nelson Textbook of Pediatrics, it provides evidence-based medical information, differential diagnoses, treatment recommendations, and clinical decision support through advanced AI technologies.

## 🩺 Key Features

### 🧠 AI-Powered Clinical Tools
- **Intelligent Chat Interface**: Real-time medical consultations with RAG-enhanced responses
- **Differential Diagnosis Generator**: AI-driven symptom analysis for pediatric conditions
- **Treatment Recommendations**: Evidence-based therapeutic guidance with dosing calculations
- **Drug Dosage Calculator**: Weight-based pediatric medication dosing with safety checks
- **Clinical Reasoning**: Advanced pathophysiological analysis and decision support

### 🚨 Emergency & Clinical Protocols
- **Emergency Protocols**: PALS, anaphylaxis management, febrile seizure protocols
- **Clinical Templates**: Standardized forms for well-child visits, asthma assessment, ADHD evaluation
- **Medical Education**: AI-generated educational content for various audiences and difficulty levels

### 📱 Modern Healthcare Interface
- **Progressive Web App**: Offline capabilities for critical situations
- **Mobile-Optimized**: Touch-friendly interface with haptic feedback
- **Voice Input**: Speech recognition for hands-free operation
- **Citation System**: Proper source attribution from Nelson Textbook
- **Session Management**: Secure chat history and clinical notes

## 🏗️ Advanced Architecture

### 🤖 Multi-Model AI Integration
- **Mistral AI**: Primary medical response generation with clinical reasoning
- **Google Gemini**: Content enhancement and multimodal analysis
- **RAG Pipeline**: Retrieval-Augmented Generation with vector embeddings
- **LangGraph Workflow**: Structured AI processing with clinical validation

### 🔧 Technology Stack
- **Frontend**: Next.js 15, React 19, TypeScript 5, Tailwind CSS 4
- **UI Components**: shadcn/ui with complete medical interface components
- **Backend**: Custom Node.js server with Socket.io for real-time features
- **Database**: Supabase with Prisma ORM for scalable data management
- **AI Services**: Mistral API, Google Gemini API, HuggingFace Embeddings
- **Mobile**: PWA with service worker for offline functionality

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ and npm/bun
- Supabase account for database
- Mistral API key
- Google Gemini API key (optional, for enhanced features)

### Installation

```bash
# Clone the repository
git clone https://github.com/drzee1205/PediatricknowledgeBase.git
cd PediatricknowledgeBase

# Install dependencies
npm install
# or
bun install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys and database URL

# Initialize database
npx prisma generate
npx prisma db push

# Start development server
npm run dev
# or
bun dev
```

### Environment Variables

```bash
# Database
DATABASE_URL="your-supabase-database-url"
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-key"

# AI Services
MISTRAL_API_KEY="your-mistral-api-key"
GEMINI_API_KEY="your-gemini-api-key"
HUGGINGFACE_API_KEY="your-huggingface-key"

# Application
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"
```

Open [http://localhost:3000](http://localhost:3000) to access NelsonGPT.

## 📁 Project Structure

```
src/
├── app/
│   ├── api/                 # Medical API endpoints
│   │   ├── rag/            # RAG pipeline endpoints
│   │   ├── chat/           # Chat management
│   │   └── health/         # System health checks
│   ├── clinical/           # Clinical tools interface
│   └── settings/           # Application settings
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── ClinicalFeatures.tsx # Clinical tools component
│   ├── MarkdownRenderer.tsx # Medical content renderer
│   └── SettingsModal.tsx   # Settings management
├── lib/
│   ├── rag-pipeline.ts     # RAG implementation
│   ├── mistral-service.ts  # Mistral AI integration
│   ├── gemini-service.ts   # Gemini AI integration
│   ├── embeddings.ts       # Vector embeddings
│   ├── supabase.ts         # Database operations
│   └── langgraph-workflow.ts # AI workflow management
└── hooks/
    ├── use-mobile-features.ts # Mobile PWA hooks
    └── use-toast.ts          # Notification system
```

## 🔗 API Endpoints

### Medical AI Endpoints
- `POST /api/rag/chat` - Main chat interface with RAG
- `POST /api/rag/clinical/diagnosis` - Differential diagnosis generation
- `POST /api/rag/clinical/treatment` - Treatment recommendations
- `POST /api/rag/education` - Medical education content

### System Endpoints
- `GET /api/health` - System health and service status
- `GET /api/chat/sessions` - Chat session management
- `POST /api/chat/messages` - Message storage and retrieval

## 🛡️ Security & Compliance

### Medical Data Protection
- All medical conversations are encrypted in transit and at rest
- No PHI (Protected Health Information) is stored without explicit consent
- Session data is automatically purged based on retention policies
- API rate limiting to prevent abuse

### Important Disclaimers
⚠️ **Medical Disclaimer**: NelsonGPT is designed as a clinical decision support tool for healthcare professionals. It should not replace professional medical judgment, clinical examination, or direct patient care. Always verify information with current medical literature and consult with senior clinicians when appropriate.

⚠️ **Content Licensing**: This application references the Nelson Textbook of Pediatrics. Ensure proper licensing agreements are in place for commercial use.

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run medical AI pipeline tests
npm run test:medical

# Run API endpoint tests
npm run test:api
```

## 🚀 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed production deployment instructions including:
- Environment configuration
- Database setup and migrations
- SSL certificate configuration
- Health monitoring setup
- Scaling considerations

## 🤝 Contributing

We welcome contributions from medical professionals and developers. Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Medical Content Contributions
- All medical content must be evidence-based
- Cite appropriate peer-reviewed sources
- Follow established medical writing guidelines
- Include appropriate disclaimers

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Third-Party Licenses
- Nelson Textbook of Pediatrics content used under appropriate licensing
- AI model usage subject to respective provider terms
- shadcn/ui components under MIT License

## 📞 Support

For technical support, medical content questions, or deployment assistance:
- Create an issue in this repository
- Email: support@nelsongpt.medical
- Documentation: [docs.nelsongpt.medical](https://docs.nelsongpt.medical)

---

**Built for pediatric healthcare professionals worldwide** 🌍  
*Empowering clinical decision-making with AI* 🤖
