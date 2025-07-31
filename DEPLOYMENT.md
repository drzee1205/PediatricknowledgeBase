# 🚀 Production Deployment Guide for NelsonGPT

## Prerequisites
- Node.js 20+
- Supabase account
- Mistral & Gemini API keys
- SSL certificate

## Environment Setup
```bash
NODE_ENV=production
DATABASE_URL="your-supabase-url"
MISTRAL_API_KEY="your-key"
GEMINI_API_KEY="your-key"
NEXTAUTH_SECRET="strong-secret"
```

## Deployment Steps

### 1. Vercel (Recommended)
```bash
npm i -g vercel
vercel login
vercel --prod
```

### 2. Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Security Checklist
- [ ] SSL/TLS enabled
- [ ] Environment variables secured
- [ ] Database RLS enabled
- [ ] Rate limiting configured
- [ ] Audit logging enabled

## Health Monitoring
- Health endpoint: `/api/health`
- Monitor AI service availability
- Database connection status
- Response time metrics

## Backup Strategy
- Daily database backups
- Encrypted storage
- Point-in-time recovery

For detailed instructions, see full documentation.