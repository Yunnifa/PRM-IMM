import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { db } from '../db';
import { meetingRequests, meetingRequestHistory } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

const app = new OpenAPIHono();

const HistorySchema = z.object({
  timestamp: z.string(),
  action: z.string(),
  by: z.string(),
  whatsapp: z.string().nullable(),
  status: z.enum(['submitted', 'approved', 'rejected']),
  notes: z.string().nullable(),
});

const MeetingRequestSchema = z.object({
  id: z.number(),
  requestId: z.string(),
  nama: z.string(),
  whatsapp: z.string(),
  department: z.string(),
  tanggal: z.string(),
  hari: z.string(),
  jamMulai: z.string(),
  jamBerakhir: z.string(),
  jumlahPeserta: z.number(),
  agenda: z.string(),
  namaRuangan: z.string(),
  fasilitas: z.string(),
  headGA: z.enum(['pending', 'approved', 'rejected']),
  headOS: z.enum(['pending', 'approved', 'rejected']),
  history: z.array(HistorySchema),
  createdAt: z.string(),
});

const CreateMeetingRequestSchema = z.object({
  userId: z.number(),
  nama: z.string().min(1),
  whatsapp: z.string().min(1),
  department: z.string().min(1),
  tanggal: z.string().min(1),
  hari: z.string().min(1),
  jamMulai: z.string().min(1),
  jamBerakhir: z.string().min(1),
  jumlahPeserta: z.number().min(1),
  agenda: z.string().min(1),
  namaRuangan: z.string().min(1),
  fasilitas: z.string().min(1),
});

const UpdateApprovalSchema = z.object({
  type: z.enum(['approveGA', 'rejectGA', 'approveOS', 'rejectOS']),
  notes: z.string().optional(),
});

const UpdateMeetingRequestSchema = z.object({
  nama: z.string().min(1).optional(),
  whatsapp: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
  tanggal: z.string().min(1).optional(),
  hari: z.string().min(1).optional(),
  jamMulai: z.string().min(1).optional(),
  jamBerakhir: z.string().min(1).optional(),
  jumlahPeserta: z.number().min(1).optional(),
  agenda: z.string().min(1).optional(),
  namaRuangan: z.string().min(1).optional(),
  fasilitas: z.string().min(1).optional(),
});

// Get all meeting requests
const getMeetingRequestsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Meeting Requests'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(MeetingRequestSchema),
          }),
        },
      },
      description: 'Get all meeting requests',
    },
  },
});

app.openapi(getMeetingRequestsRoute, async (c) => {
  const requests = await db.select().from(meetingRequests).orderBy(desc(meetingRequests.createdAt));
  
  const requestsWithHistory = await Promise.all(
    requests.map(async (request) => {
      const history = await db.select()
        .from(meetingRequestHistory)
        .where(eq(meetingRequestHistory.meetingRequestId, request.id))
        .orderBy(meetingRequestHistory.timestamp);

      return {
        id: request.id,
        requestId: request.requestId,
        nama: request.nama,
        whatsapp: request.whatsapp,
        department: request.department,
        tanggal: request.tanggal,
        hari: request.hari,
        jamMulai: request.jamMulai,
        jamBerakhir: request.jamBerakhir,
        jumlahPeserta: request.jumlahPeserta,
        agenda: request.agenda,
        namaRuangan: request.namaRuangan,
        fasilitas: request.fasilitas,
        headGA: request.headGA,
        headOS: request.headOS,
        history: history.map(h => ({
          timestamp: h.timestamp?.toISOString() || '',
          action: h.action,
          by: h.by,
          whatsapp: h.whatsapp,
          status: h.status,
          notes: h.notes,
        })),
        createdAt: request.createdAt?.toISOString() || '',
      };
    })
  );

  return c.json({ success: true, data: requestsWithHistory });
});

// Create meeting request
const createMeetingRequestRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Meeting Requests'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateMeetingRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: MeetingRequestSchema,
          }),
        },
      },
      description: 'Meeting request created',
    },
  },
});

app.openapi(createMeetingRequestRoute, async (c) => {
  const data = c.req.valid('json');

  // Generate request ID
  const count = await db.select().from(meetingRequests);
  const requestId = `MTG-${count.length + 1}`;

  const [newRequest] = await db.insert(meetingRequests).values({
    requestId,
    ...data,
  }).returning();

  // Create initial history entry
  await db.insert(meetingRequestHistory).values({
    meetingRequestId: newRequest.id,
    action: 'Pengajuan ruang meeting',
    by: data.nama,
    whatsapp: data.whatsapp,
    status: 'submitted',
  });

  const history = await db.select()
    .from(meetingRequestHistory)
    .where(eq(meetingRequestHistory.meetingRequestId, newRequest.id));

  return c.json({
    success: true,
    data: {
      id: newRequest.id,
      requestId: newRequest.requestId,
      nama: newRequest.nama,
      whatsapp: newRequest.whatsapp,
      department: newRequest.department,
      tanggal: newRequest.tanggal,
      hari: newRequest.hari,
      jamMulai: newRequest.jamMulai,
      jamBerakhir: newRequest.jamBerakhir,
      jumlahPeserta: newRequest.jumlahPeserta,
      agenda: newRequest.agenda,
      namaRuangan: newRequest.namaRuangan,
      fasilitas: newRequest.fasilitas,
      headGA: newRequest.headGA,
      headOS: newRequest.headOS,
      history: history.map(h => ({
        timestamp: h.timestamp?.toISOString() || '',
        action: h.action,
        by: h.by,
        whatsapp: h.whatsapp,
        status: h.status,
        notes: h.notes,
      })),
      createdAt: newRequest.createdAt?.toISOString() || '',
    },
  }, 201);
});

// Update approval status
const updateApprovalRoute = createRoute({
  method: 'patch',
  path: '/{id}/approval',
  tags: ['Meeting Requests'],
  request: {
    params: z.object({
      id: z.string().transform(Number),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateApprovalSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: MeetingRequestSchema,
          }),
        },
      },
      description: 'Approval updated',
    },
  },
});

app.openapi(updateApprovalRoute, async (c) => {
  const { id } = c.req.valid('param');
  const { type, notes } = c.req.valid('json');

  let updateData: any = {};
  let historyAction = '';
  let historyBy = '';
  let historyStatus: 'approved' | 'rejected' = 'approved';

  switch (type) {
    case 'approveGA':
      updateData = { headGA: 'approved' };
      historyAction = 'Approved by Head GA';
      historyBy = 'Head GA';
      historyStatus = 'approved';
      break;
    case 'rejectGA':
      updateData = { headGA: 'rejected' };
      historyAction = 'Rejected by Head GA';
      historyBy = 'Head GA';
      historyStatus = 'rejected';
      break;
    case 'approveOS':
      updateData = { headOS: 'approved' };
      historyAction = 'Approved by Head OS';
      historyBy = 'Head OS';
      historyStatus = 'approved';
      break;
    case 'rejectOS':
      updateData = { headOS: 'rejected' };
      historyAction = 'Rejected by Head OS';
      historyBy = 'Head OS';
      historyStatus = 'rejected';
      break;
  }

  const [updated] = await db.update(meetingRequests)
    .set(updateData)
    .where(eq(meetingRequests.id, id))
    .returning();

  await db.insert(meetingRequestHistory).values({
    meetingRequestId: id,
    action: historyAction,
    by: historyBy,
    status: historyStatus,
    notes: notes || null,
  });

  const history = await db.select()
    .from(meetingRequestHistory)
    .where(eq(meetingRequestHistory.meetingRequestId, id))
    .orderBy(meetingRequestHistory.timestamp);

  return c.json({
    success: true,
    data: {
      id: updated.id,
      requestId: updated.requestId,
      nama: updated.nama,
      whatsapp: updated.whatsapp,
      department: updated.department,
      tanggal: updated.tanggal,
      hari: updated.hari,
      jamMulai: updated.jamMulai,
      jamBerakhir: updated.jamBerakhir,
      jumlahPeserta: updated.jumlahPeserta,
      agenda: updated.agenda,
      namaRuangan: updated.namaRuangan,
      fasilitas: updated.fasilitas,
      headGA: updated.headGA,
      headOS: updated.headOS,
      history: history.map(h => ({
        timestamp: h.timestamp?.toISOString() || '',
        action: h.action,
        by: h.by,
        whatsapp: h.whatsapp,
        status: h.status,
        notes: h.notes,
      })),
      createdAt: updated.createdAt?.toISOString() || '',
    },
  });
});

// Update meeting request
const updateMeetingRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  tags: ['Meeting Requests'],
  request: {
    params: z.object({
      id: z.string().transform(Number),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateMeetingRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: MeetingRequestSchema.optional(),
            message: z.string().optional(),
          }),
        },
      },
      description: 'Meeting request updated or not found',
    },
  },
});

app.openapi(updateMeetingRoute, async (c) => {
  const { id } = c.req.valid('param');
  const updateData = c.req.valid('json');

  const [updated] = await db.update(meetingRequests)
    .set(updateData)
    .where(eq(meetingRequests.id, id))
    .returning();

  if (!updated) {
    return c.json({ success: false, message: 'Meeting request not found' }, 200);
  }

  // Add history entry
  await db.insert(meetingRequestHistory).values({
    meetingRequestId: id,
    action: 'Meeting request updated',
    by: 'User',
    status: 'submitted',
    notes: 'Meeting details updated',
  });

  const history = await db.select()
    .from(meetingRequestHistory)
    .where(eq(meetingRequestHistory.meetingRequestId, id))
    .orderBy(meetingRequestHistory.timestamp);

  return c.json({
    success: true,
    data: {
      id: updated.id,
      requestId: updated.requestId,
      nama: updated.nama,
      whatsapp: updated.whatsapp,
      department: updated.department,
      tanggal: updated.tanggal,
      hari: updated.hari,
      jamMulai: updated.jamMulai,
      jamBerakhir: updated.jamBerakhir,
      jumlahPeserta: updated.jumlahPeserta,
      agenda: updated.agenda,
      namaRuangan: updated.namaRuangan,
      fasilitas: updated.fasilitas,
      headGA: updated.headGA,
      headOS: updated.headOS,
      history: history.map(h => ({
        timestamp: h.timestamp?.toISOString() || '',
        action: h.action,
        by: h.by,
        whatsapp: h.whatsapp,
        status: h.status,
        notes: h.notes,
      })),
      createdAt: updated.createdAt?.toISOString() || '',
    },
  });
});

// Delete meeting request
const deleteMeetingRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Meeting Requests'],
  request: {
    params: z.object({
      id: z.string().transform(Number),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
      description: 'Meeting request deleted',
    },
  },
});

app.openapi(deleteMeetingRoute, async (c) => {
  const { id } = c.req.valid('param');

  // Delete history first (foreign key constraint)
  await db.delete(meetingRequestHistory)
    .where(eq(meetingRequestHistory.meetingRequestId, id));

  // Delete meeting request
  await db.delete(meetingRequests)
    .where(eq(meetingRequests.id, id));

  return c.json({
    success: true,
    message: 'Meeting request deleted successfully',
  });
});

export default app;
