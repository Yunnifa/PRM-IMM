import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { db } from '../db';
import { meetingRequests, meetingRequestHistory, users } from '../db/schema';
import { eq, desc, and, or } from 'drizzle-orm';
import { sendMeetingRequestNotification, sendApprovalNotification } from '../services/emailService';
import { notifyNewRequest, notifyGAAfterHeadApproval, type TelegramApprover, type TelegramMeetingData } from '../services/telegramService';

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
  headDept: z.enum(['pending', 'approved', 'rejected']),
  ga: z.enum(['pending', 'approved', 'rejected']),
  history: z.array(HistorySchema),
  createdAt: z.string(),
});

const CreateMeetingRequestSchema = z.object({
  userId: z.number().nullable().optional(), // Optional for guest users
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
  type: z.enum(['approveHeadDept', 'rejectHeadDept', 'approveGA', 'rejectGA']),
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
        headDept: request.headDept,
        ga: request.ga,
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
    409: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
      description: 'Time conflict - room already booked',
    },
  },
});

app.openapi(createMeetingRequestRoute, async (c) => {
  const data = c.req.valid('json');

  // Check for time conflicts (same room, same date, overlapping time, not rejected)
  const existingBookings = await db.select()
    .from(meetingRequests)
    .where(
      and(
        eq(meetingRequests.namaRuangan, data.namaRuangan),
        eq(meetingRequests.tanggal, data.tanggal),
        // Exclude rejected bookings
        or(
          and(
            eq(meetingRequests.headDept, 'pending'),
          ),
          and(
            eq(meetingRequests.headDept, 'approved'),
            eq(meetingRequests.ga, 'pending'),
          ),
          and(
            eq(meetingRequests.headDept, 'approved'),
            eq(meetingRequests.ga, 'approved'),
          )
        )
      )
    );

  // Convert time to minutes for comparison
  const toMinutes = (time: string): number => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const newStart = toMinutes(data.jamMulai);
  const newEnd = toMinutes(data.jamBerakhir);

  // Check for overlap
  const hasConflict = existingBookings.some(booking => {
    const existingStart = toMinutes(booking.jamMulai);
    const existingEnd = toMinutes(booking.jamBerakhir);
    return newStart < existingEnd && newEnd > existingStart;
  });

  if (hasConflict) {
    return c.json({
      success: false,
      message: `Ruangan ${data.namaRuangan} sudah dibooking pada waktu tersebut. Silakan pilih waktu lain.`,
    }, 409);
  }

  // Generate request ID
  const count = await db.select().from(meetingRequests);
  const requestId = `MTG-${count.length + 1}`;

  // Handle userId - set to null if 0 or not provided (guest user)
  const userId = data.userId && data.userId > 0 ? data.userId : null;

  const [newRequest] = await db.insert(meetingRequests).values({
    requestId,
    ...data,
    userId, // Override with properly handled userId
  }).returning();

  // Create initial history entry
  await db.insert(meetingRequestHistory).values({
    meetingRequestId: newRequest.id,
    action: 'Pengajuan ruang meeting',
    by: data.nama,
    whatsapp: data.whatsapp,
    status: 'submitted',
  });

  // Send notifications (fire-and-forget for faster response)
  (async () => {
    try {
      // Find Head Department user for this specific department only
      const headDeptUsers = await db.select({
        email: users.email,
        fullName: users.fullName,
        telegramChatId: users.telegramChatId,
      })
      .from(users)
      .where(
        and(
          eq(users.role, 'head_dept'),
          eq(users.department, data.department),
          eq(users.isActive, 1)
        )
      );

      // Find General Affair users (GA can approve all departments)
      const gaUsers = await db.select({
        email: users.email,
        fullName: users.fullName,
        telegramChatId: users.telegramChatId,
      })
      .from(users)
      .where(
        and(
          eq(users.role, 'ga'),
          eq(users.isActive, 1)
        )
      );

      const meetingData: TelegramMeetingData = {
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
      };

      // Send Telegram to Head Dept only (GA notified after Head Dept approves)
      const telegramApprovers: TelegramApprover[] = headDeptUsers.map(h => ({
        fullName: h.fullName,
        telegramChatId: h.telegramChatId,
        role: 'head_dept' as const,
      }));

      await notifyNewRequest(meetingData, telegramApprovers);
      console.log(`📱 Telegram notifications sent to ${telegramApprovers.length} Head Dept approvers`);

      // Also send email to all approvers (Head Dept + GA)
      const emailApprovers = [
        ...headDeptUsers.map(h => ({ email: h.email, fullName: h.fullName, role: 'head_dept' as const })),
        ...gaUsers.map(g => ({ email: g.email, fullName: g.fullName, role: 'ga' as const })),
      ];

      if (emailApprovers.length > 0) {
        await sendMeetingRequestNotification(meetingData, emailApprovers);
        console.log(`📧 Email notifications sent to ${emailApprovers.length} approvers`);
      }
    } catch (notifError) {
      console.error('❌ Failed to send notifications:', notifError);
    }
  })();

  // Return initial history directly (no need to query again)
  const history = [{
    timestamp: new Date().toISOString(),
    action: 'Pengajuan ruang meeting',
    by: data.nama,
    whatsapp: data.whatsapp,
    status: 'submitted' as const,
    notes: null,
  }];

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
      headDept: newRequest.headDept,
      ga: newRequest.ga,
      history: history,
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
    case 'approveHeadDept':
      updateData = { headDept: 'approved' };
      historyAction = 'Approved by Head Department';
      historyBy = 'Head Department';
      historyStatus = 'approved';
      break;
    case 'rejectHeadDept':
      updateData = { headDept: 'rejected' };
      historyAction = 'Rejected by Head Department';
      historyBy = 'Head Department';
      historyStatus = 'rejected';
      break;
    case 'approveGA':
      updateData = { ga: 'approved' };
      historyAction = 'Approved by General Affairs';
      historyBy = 'General Affairs';
      historyStatus = 'approved';
      break;
    case 'rejectGA':
      updateData = { ga: 'rejected' };
      historyAction = 'Rejected by General Affairs';
      historyBy = 'General Affairs';
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

  // Send Telegram to GA when Head Dept approves (fire-and-forget)
  if (type === 'approveHeadDept') {
    (async () => {
      try {
        const gaUsers = await db.select({
          fullName: users.fullName,
          telegramChatId: users.telegramChatId,
        })
        .from(users)
        .where(
          and(
            eq(users.role, 'ga'),
            eq(users.isActive, 1)
          )
        );

        const gaApprovers: TelegramApprover[] = gaUsers.map(g => ({
          fullName: g.fullName,
          telegramChatId: g.telegramChatId,
          role: 'ga' as const,
        }));

        await notifyGAAfterHeadApproval({
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
        }, gaApprovers);
        console.log(`📱 Telegram sent to ${gaApprovers.length} GA approvers`);
      } catch (err) {
        console.error('❌ Failed to send Telegram to GA:', err);
      }
    })();
  }

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
      headDept: updated.headDept,
      ga: updated.ga,
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
      headDept: updated.headDept,
      ga: updated.ga,
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
