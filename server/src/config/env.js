import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server root or project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config(); // fallback to current working directory

export const config = {
  port: process.env.PORT || 5001,
  nodeEnv: process.env.NODE_ENV || 'development',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
  adminApiKey: process.env.ADMIN_API_KEY || '',
  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    // Selected currently available free-tier fast versatile model: llama-3.3-70b-versatile or llama-3.1-8b-instant
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    fallbackModel: 'llama-3.1-8b-instant',
  },
  hindsight: {
    apiKey: process.env.HINDSIGHT_API_KEY || '',
    bankId: process.env.HINDSIGHT_BANK_ID || 'feedbackmind-demo',
    baseUrl: process.env.HINDSIGHT_BASE_URL || 'https://api.hindsight.vectorize.io'
  },
  database: {
    path: path.resolve(__dirname, '../../', process.env.DATABASE_PATH || 'feedbackmind.sqlite')
  }
};

