import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import 'dotenv/config';

// Import routes
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import departmentsRoutes from './routes/departments';
import roomsRoutes from './routes/rooms';
import facilitiesRoutes from './routes/facilities';
import meetingRequestsRoutes from './routes/meetingRequests';

// Import middleware
import apiLoggerMiddleware from './middleware/apiLogger';

const app = new OpenAPIHono();

// Get frontend URL from env or use defaults
const frontendUrls = process.env.FRONTEND_URL 
  ? [process.env.FRONTEND_URL, 'http://localhost:3001', 'http://localhost:5173']
  : ['http://localhost:3001', 'http://localhost:5173'];

// Middleware
app.use('*', logger()); // Console logger (built-in Hono)
app.use('*', prettyJSON());
app.use('*', cors({
  origin: frontendUrls,
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// API Logger Middleware - mencatat semua request ke database
app.use('/api/*', apiLoggerMiddleware);

// Health check
app.get('/', (c) => {
  return c.json({
    message: 'PRM-IMM Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.route('/api/auth', authRoutes);
app.route('/api/users', usersRoutes);
app.route('/api/departments', departmentsRoutes);
app.route('/api/rooms', roomsRoutes);
app.route('/api/facilities', facilitiesRoutes);
app.route('/api/meeting-requests', meetingRequestsRoutes);

// Swagger UI
app.get('/swagger', swaggerUI({
  url: '/api/openapi.json',
}));

// OpenAPI JSON
const apiBaseUrl = process.env.RAILWAY_PUBLIC_DOMAIN 
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : `http://localhost:${process.env.PORT || '3000'}`;

app.doc('/api/openapi.json', {
  openapi: '3.0.0',
  info: {
    title: 'PRM-IMM API',
    version: '1.0.0',
    description: 'API untuk sistem manajemen peminjaman ruangan meeting',
  },
  servers: [
    {
      url: apiBaseUrl,
      description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
    },
  ],
});

const port = parseInt(process.env.PORT || '3000');
const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

console.log(`🚀 Server is running on ${host}:${port}`);
console.log(`📚 Swagger UI: ${apiBaseUrl}/swagger`);
console.log(`📖 OpenAPI Spec: ${apiBaseUrl}/api/openapi.json`);

serve({
  fetch: app.fetch,
  port,
  hostname: host,
});
