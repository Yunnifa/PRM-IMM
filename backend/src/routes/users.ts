import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { db } from '../db';
import { users } from '../db/schema';
import { eq, inArray, and } from 'drizzle-orm';

const app = new OpenAPIHono();

const UserSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string(),
  fullName: z.string(),
  whatsapp: z.string(),
  birthDate: z.string().nullable(),
  department: z.string().nullable(),
  role: z.string(),
  isActive: z.number(),
  createdAt: z.string(),
});

const UpdateUserSchema = z.object({
  username: z.string().optional(),
  email: z.string().email().optional(),
  fullName: z.string().optional(),
  whatsapp: z.string().optional(),
  birthDate: z.string().optional(),
  department: z.string().optional(),
  role: z.enum(['admin', 'head_ga', 'head_os', 'user']).optional(),
  isActive: z.number().optional(),
});

// Get all users (only active)
const getUsersRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Users'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(UserSchema),
          }),
        },
      },
      description: 'Get all active users',
    },
  },
});

app.openapi(getUsersRoute, async (c) => {
  const allUsers = await db.select({
    id: users.id,
    username: users.username,
    email: users.email,
    fullName: users.fullName,
    whatsapp: users.whatsapp,
    birthDate: users.birthDate,
    department: users.department,
    role: users.role,
    isActive: users.isActive,
    createdAt: users.createdAt,
  }).from(users).where(eq(users.isActive, 1));

  const formattedUsers = allUsers.map(user => ({
    ...user,
    createdAt: user.createdAt?.toISOString() || '',
  }));

  return c.json({ success: true, data: formattedUsers });
});

// Get user by ID
const getUserByIdRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Users'],
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
            data: UserSchema.optional(),
            message: z.string().optional(),
          }),
        },
      },
      description: 'Get user by ID or not found',
    },
  },
});

app.openapi(getUserByIdRoute, async (c) => {
  const { id } = c.req.valid('param');
  const [user] = await db.select().from(users).where(and(eq(users.id, id), eq(users.isActive, 1)));

  if (!user) {
    return c.json({ success: false, message: 'User not found' }, 200);
  }

  const userResponse = {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    whatsapp: user.whatsapp,
    birthDate: user.birthDate,
    department: user.department,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt?.toISOString() || '',
  };

  return c.json({ success: true, data: userResponse }, 200);
});

// Update user
const updateUserRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  tags: ['Users'],
  request: {
    params: z.object({
      id: z.string().transform(Number),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateUserSchema,
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
            data: UserSchema.optional(),
            message: z.string().optional(),
          }),
        },
      },
      description: 'User updated or not found',
    },
  },
});

app.openapi(updateUserRoute, async (c) => {
  const { id } = c.req.valid('param');
  const data = c.req.valid('json');

  const [updatedUser] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();

  if (!updatedUser) {
    return c.json({ success: false, message: 'User not found' }, 200);
  }

  return c.json({
    success: true,
    data: {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      fullName: updatedUser.fullName,
      whatsapp: updatedUser.whatsapp,
      birthDate: updatedUser.birthDate,
      department: updatedUser.department,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
      createdAt: updatedUser.createdAt?.toISOString() || '',
    },
  }, 200);
});

// Delete user (soft delete)
const deleteUserRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Users'],
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
      description: 'User soft deleted or not found',
    },
  },
});

app.openapi(deleteUserRoute, async (c) => {
  const { id } = c.req.valid('param');

  const [deletedUser] = await db
    .update(users)
    .set({ isActive: 0, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();

  if (!deletedUser) {
    return c.json({ success: false, message: 'User not found' }, 200);
  }

  return c.json({ success: true, message: 'User deleted successfully' }, 200);
});

// Bulk delete users (soft delete)
const bulkDeleteUsersRoute = createRoute({
  method: 'post',
  path: '/bulk-delete',
  tags: ['Users'],
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
      description: 'Users bulk soft deleted',
    },
  },
});

app.openapi(bulkDeleteUsersRoute, async (c) => {
  const { ids } = c.req.valid('json');

  const result = await db
    .update(users)
    .set({ isActive: 0, updatedAt: new Date() })
    .where(inArray(users.id, ids))
    .returning();

  return c.json({
    success: true,
    message: `${result.length} users deleted successfully`,
    deletedCount: result.length,
  });
});

export default app;
