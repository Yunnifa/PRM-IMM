import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { db } from '../db';
import { emailLogs } from '../db/schema';
import { desc, eq } from 'drizzle-orm';

const app = new OpenAPIHono();

const EmailLogSchema = z.object({
  id: z.number(),
  toEmail: z.string(),
  toName: z.string().nullable(),
  subject: z.string(),
  emailType: z.string(),
  meetingRequestId: z.number().nullable(),
  status: z.enum(['sent', 'failed']),
  messageId: z.string().nullable(),
  errorMessage: z.string().nullable(),
  sentAt: z.string(),
});

// Get all email logs
const getEmailLogsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Email Logs'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(EmailLogSchema),
          }),
        },
      },
      description: 'Get all email logs',
    },
  },
});

app.openapi(getEmailLogsRoute, async (c) => {
  const logs = await db.select().from(emailLogs).orderBy(desc(emailLogs.sentAt));
  
  return c.json({
    success: true,
    data: logs.map(log => ({
      ...log,
      sentAt: log.sentAt.toISOString(),
    })),
  });
});

// Get email logs by status
const getEmailLogsByStatusRoute = createRoute({
  method: 'get',
  path: '/status/:status',
  tags: ['Email Logs'],
  request: {
    params: z.object({
      status: z.enum(['sent', 'failed']),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(EmailLogSchema),
          }),
        },
      },
      description: 'Get email logs by status',
    },
  },
});

app.openapi(getEmailLogsByStatusRoute, async (c) => {
  const { status } = c.req.valid('param');
  const logs = await db.select()
    .from(emailLogs)
    .where(eq(emailLogs.status, status))
    .orderBy(desc(emailLogs.sentAt));
  
  return c.json({
    success: true,
    data: logs.map(log => ({
      ...log,
      sentAt: log.sentAt.toISOString(),
    })),
  });
});

// Get email statistics
const getEmailStatsRoute = createRoute({
  method: 'get',
  path: '/stats',
  tags: ['Email Logs'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.object({
              total: z.number(),
              sent: z.number(),
              failed: z.number(),
            }),
          }),
        },
      },
      description: 'Get email statistics',
    },
  },
});

app.openapi(getEmailStatsRoute, async (c) => {
  const allLogs = await db.select().from(emailLogs);
  const sent = allLogs.filter(log => log.status === 'sent').length;
  const failed = allLogs.filter(log => log.status === 'failed').length;
  
  return c.json({
    success: true,
    data: {
      total: allLogs.length,
      sent,
      failed,
    },
  });
});

export default app;
