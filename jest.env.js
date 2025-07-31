// Environment configuration for Jest tests

// Set up test environment variables
process.env.NODE_ENV = 'test'
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-jest-testing-only'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/nelsongpt_test'
process.env.MISTRAL_API_KEY = 'test-mistral-api-key'
process.env.GEMINI_API_KEY = 'test-gemini-api-key'
process.env.HUGGINGFACE_API_KEY = 'test-huggingface-key'
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters'
process.env.CORS_ORIGIN = 'http://localhost:3000'
process.env.RATE_LIMIT_MAX = '1000'
process.env.RATE_LIMIT_WINDOW = '900000'

// Supabase test configuration
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

// Disable logging during tests
process.env.LOG_LEVEL = 'error'