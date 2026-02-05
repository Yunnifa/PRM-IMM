import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { db } from '../db';
import { departments } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';

const app = new OpenAPIHono();

const DepartmentSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  isActive: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const CreateDepartmentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const UpdateDepartmentSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isActive: z.number().optional(),
});

// Get all departments (only active)
const getDepartmentsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Departments'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(DepartmentSchema),
          }),
        },
      },
      description: 'Get all departments',
    },
  },
});

app.openapi(getDepartmentsRoute, async (c) => {
  const allDepartments = await db.select().from(departments).where(eq(departments.isActive, 1));
  const formatted = allDepartments.map(dept => ({
    ...dept,
    createdAt: dept.createdAt?.toISOString() || '',
    updatedAt: dept.updatedAt?.toISOString() || '',
  }));
  return c.json({ success: true, data: formatted });
});

// Create department
const createDepartmentRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Departments'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateDepartmentSchema,
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
            data: DepartmentSchema,
          }),
        },
      },
      description: 'Department created',
    },
  },
});

app.openapi(createDepartmentRoute, async (c) => {
  const data = c.req.valid('json');
  const [newDept] = await db.insert(departments).values(data).returning();
  return c.json({
    success: true,
    data: {
      ...newDept,
      createdAt: newDept.createdAt?.toISOString() || '',
      updatedAt: newDept.updatedAt?.toISOString() || '',
    },
  }, 201);
});

// Update department
const updateDepartmentRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  tags: ['Departments'],
  request: {
    params: z.object({
      id: z.string().transform(Number),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateDepartmentSchema,
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
            data: DepartmentSchema.optional(),
            message: z.string().optional(),
          }),
        },
      },
      description: 'Department updated or not found',
    },
  },
});

app.openapi(updateDepartmentRoute, async (c) => {
  const { id } = c.req.valid('param');
  const data = c.req.valid('json');
  
  const [updated] = await db.update(departments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(departments.id, id))
    .returning();
  
  if (!updated) {
    return c.json({ success: false, message: 'Department not found' }, 200);
  }
  
  return c.json({
    success: true,
    data: {
      ...updated,
      createdAt: updated.createdAt?.toISOString() || '',
      updatedAt: updated.updatedAt?.toISOString() || '',
    },
  }, 200);
});

// Soft delete department (single)
const deleteDepartmentRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Departments'],
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
      description: 'Department soft deleted',
    },
  },
});

app.openapi(deleteDepartmentRoute, async (c) => {
  const { id } = c.req.valid('param');
  
  await db.update(departments)
    .set({ isActive: 0, updatedAt: new Date() })
    .where(eq(departments.id, id));
  
  return c.json({ success: true, message: 'Department deleted successfully' });
});

// Bulk soft delete departments
const bulkDeleteDepartmentsRoute = createRoute({
  method: 'post',
  path: '/bulk-delete',
  tags: ['Departments'],
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
      description: 'Departments soft deleted',
    },
  },
});

app.openapi(bulkDeleteDepartmentsRoute, async (c) => {
  const { ids } = c.req.valid('json');
  
  await db.update(departments)
    .set({ isActive: 0, updatedAt: new Date() })
    .where(inArray(departments.id, ids));
  
  return c.json({ success: true, message: 'Departments deleted successfully', deletedCount: ids.length });
});

export default app;
