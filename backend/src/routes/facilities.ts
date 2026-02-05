import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { db } from '../db';
import { facilities } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';

const app = new OpenAPIHono();

const FacilitySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  isActive: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const CreateFacilitySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const UpdateFacilitySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isActive: z.number().optional(),
});

// Get all facilities (only active)
const getFacilitiesRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Facilities'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(FacilitySchema),
          }),
        },
      },
      description: 'Get all active facilities',
    },
  },
});

app.openapi(getFacilitiesRoute, async (c) => {
  const allFacilities = await db.select().from(facilities).where(eq(facilities.isActive, 1));
  const formatted = allFacilities.map(facility => ({
    ...facility,
    createdAt: facility.createdAt?.toISOString() || '',
    updatedAt: facility.updatedAt?.toISOString() || '',
  }));
  return c.json({ success: true, data: formatted });
});

// Create facility
const createFacilityRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Facilities'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateFacilitySchema,
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
            data: FacilitySchema,
          }),
        },
      },
      description: 'Facility created',
    },
  },
});

app.openapi(createFacilityRoute, async (c) => {
  const data = c.req.valid('json');
  const [newFacility] = await db.insert(facilities).values(data).returning();
  return c.json({
    success: true,
    data: {
      ...newFacility,
      createdAt: newFacility.createdAt?.toISOString() || '',
      updatedAt: newFacility.updatedAt?.toISOString() || '',
    },
  }, 201);
});

// Update facility
const updateFacilityRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  tags: ['Facilities'],
  request: {
    params: z.object({
      id: z.string().transform(Number),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateFacilitySchema,
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
            data: FacilitySchema.optional(),
            message: z.string().optional(),
          }),
        },
      },
      description: 'Facility updated or not found',
    },
  },
});

app.openapi(updateFacilityRoute, async (c) => {
  const { id } = c.req.valid('param');
  const data = c.req.valid('json');

  const [updatedFacility] = await db
    .update(facilities)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(facilities.id, id))
    .returning();

  if (!updatedFacility) {
    return c.json({ success: false, message: 'Facility not found' }, 200);
  }

  return c.json({
    success: true,
    data: {
      ...updatedFacility,
      createdAt: updatedFacility.createdAt?.toISOString() || '',
      updatedAt: updatedFacility.updatedAt?.toISOString() || '',
    },
  }, 200);
});

// Delete facility (soft delete)
const deleteFacilityRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Facilities'],
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
      description: 'Facility soft deleted or not found',
    },
  },
});

app.openapi(deleteFacilityRoute, async (c) => {
  const { id } = c.req.valid('param');

  const [deletedFacility] = await db
    .update(facilities)
    .set({ isActive: 0, updatedAt: new Date() })
    .where(eq(facilities.id, id))
    .returning();

  if (!deletedFacility) {
    return c.json({ success: false, message: 'Facility not found' }, 200);
  }

  return c.json({ success: true, message: 'Facility deleted successfully' }, 200);
});

// Bulk delete facilities (soft delete)
const bulkDeleteFacilitiesRoute = createRoute({
  method: 'post',
  path: '/bulk-delete',
  tags: ['Facilities'],
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
      description: 'Facilities bulk soft deleted',
    },
  },
});

app.openapi(bulkDeleteFacilitiesRoute, async (c) => {
  const { ids } = c.req.valid('json');

  const result = await db
    .update(facilities)
    .set({ isActive: 0, updatedAt: new Date() })
    .where(inArray(facilities.id, ids))
    .returning();

  return c.json({
    success: true,
    message: `${result.length} facilities deleted successfully`,
    deletedCount: result.length,
  });
});

export default app;
