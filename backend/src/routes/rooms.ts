import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { db } from '../db';
import { rooms, roomFacilities, facilities } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';

const app = new OpenAPIHono();

const RoomSchema = z.object({
  id: z.number(),
  name: z.string(),
  capacity: z.number(),
  location: z.string().nullable(),
  isHybrid: z.number(),
  description: z.string().nullable(),
  isActive: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const CreateRoomSchema = z.object({
  name: z.string().min(1),
  capacity: z.number().min(1),
  location: z.string().optional(),
  isHybrid: z.number().optional(),
  description: z.string().optional(),
});

const UpdateRoomSchema = z.object({
  name: z.string().min(1).optional(),
  capacity: z.number().min(1).optional(),
  location: z.string().optional(),
  isHybrid: z.number().optional(),
  description: z.string().optional(),
  isActive: z.number().optional(),
});

// Get all rooms (only active)
const getRoomsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Rooms'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(RoomSchema),
          }),
        },
      },
      description: 'Get all active rooms',
    },
  },
});

app.openapi(getRoomsRoute, async (c) => {
  const allRooms = await db.select().from(rooms).where(eq(rooms.isActive, 1));
  const formatted = allRooms.map(room => ({
    ...room,
    createdAt: room.createdAt?.toISOString() || '',
    updatedAt: room.updatedAt?.toISOString() || '',
  }));
  return c.json({ success: true, data: formatted });
});

// Create room
const createRoomRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Rooms'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateRoomSchema,
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
            data: RoomSchema,
          }),
        },
      },
      description: 'Room created',
    },
  },
});

app.openapi(createRoomRoute, async (c) => {
  const data = c.req.valid('json');
  const [newRoom] = await db.insert(rooms).values(data).returning();
  return c.json({
    success: true,
    data: {
      ...newRoom,
      createdAt: newRoom.createdAt?.toISOString() || '',
      updatedAt: newRoom.updatedAt?.toISOString() || '',
    },
  }, 201);
});

// Update room
const updateRoomRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  tags: ['Rooms'],
  request: {
    params: z.object({
      id: z.string().transform(Number),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateRoomSchema,
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
            data: RoomSchema.optional(),
            message: z.string().optional(),
          }),
        },
      },
      description: 'Room updated or not found',
    },
  },
});

app.openapi(updateRoomRoute, async (c) => {
  const { id } = c.req.valid('param');
  const data = c.req.valid('json');

  const [updatedRoom] = await db
    .update(rooms)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(rooms.id, id))
    .returning();

  if (!updatedRoom) {
    return c.json({ success: false, message: 'Room not found' }, 200);
  }

  return c.json({
    success: true,
    data: {
      ...updatedRoom,
      createdAt: updatedRoom.createdAt?.toISOString() || '',
      updatedAt: updatedRoom.updatedAt?.toISOString() || '',
    },
  }, 200);
});

// Delete room (soft delete)
const deleteRoomRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Rooms'],
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
      description: 'Room soft deleted or not found',
    },
  },
});

app.openapi(deleteRoomRoute, async (c) => {
  const { id } = c.req.valid('param');

  const [deletedRoom] = await db
    .update(rooms)
    .set({ isActive: 0, updatedAt: new Date() })
    .where(eq(rooms.id, id))
    .returning();

  if (!deletedRoom) {
    return c.json({ success: false, message: 'Room not found' }, 200);
  }

  return c.json({ success: true, message: 'Room deleted successfully' }, 200);
});

// Bulk delete rooms (soft delete)
const bulkDeleteRoomsRoute = createRoute({
  method: 'post',
  path: '/bulk-delete',
  tags: ['Rooms'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            ids: z.array(z.number()),
          }),
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
            message: z.string(),
            deletedCount: z.number(),
          }),
        },
      },
      description: 'Rooms bulk soft deleted',
    },
  },
});

app.openapi(bulkDeleteRoomsRoute, async (c) => {
  const { ids } = c.req.valid('json');

  const result = await db
    .update(rooms)
    .set({ isActive: 0, updatedAt: new Date() })
    .where(inArray(rooms.id, ids))
    .returning();

  return c.json({
    success: true,
    message: `${result.length} rooms deleted successfully`,
    deletedCount: result.length,
  });
});

export default app;
