import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = new OpenAPIHono();

// Schema definitions
const LoginSchema = z.object({
  whatsapp: z.string().min(10, 'Nomor telepon minimal 10 digit'),
  password: z.string().min(6),
});

const RegisterSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  fullName: z.string().min(1),
  whatsapp: z.string().min(10, 'Nomor telepon minimal 10 digit'),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  department: z.string().optional(),
  role: z.enum(['admin', 'head_ga', 'head_os', 'user']).optional(),
});

const UserResponseSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string(),
  fullName: z.string(),
  whatsapp: z.string(),
  birthDate: z.string().nullable(),
  department: z.string().nullable(),
  role: z.string(),
  createdAt: z.string(),
});

const AuthResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    token: z.string(),
    user: UserResponseSchema,
  }).optional(),
});

// Login route
const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  tags: ['Authentication'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: LoginSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: AuthResponseSchema,
        },
      },
      description: 'Login successful',
    },
    401: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
      description: 'Invalid credentials',
    },
    500: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
      description: 'Internal server error',
    },
  },
});

app.openapi(loginRoute, async (c) => {
  try {
    const { whatsapp, password } = c.req.valid('json');

    const [user] = await db.select().from(users).where(eq(users.whatsapp, whatsapp));

    if (!user) {
      return c.json({ success: false, message: 'Nomor telepon tidak terdaftar' }, 401);
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return c.json({ success: false, message: 'Password salah' }, 401);
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      whatsapp: user.whatsapp,
      birthDate: user.birthDate,
      department: user.department,
      role: user.role,
      createdAt: user.createdAt?.toISOString() || '',
    };

    return c.json({
      success: true,
      message: 'Login successful',
      data: { token, user: userResponse },
    });
  } catch (error) {
    return c.json({ success: false, message: 'Internal server error' }, 500);
  }
});

// Register route
const registerRoute = createRoute({
  method: 'post',
  path: '/register',
  tags: ['Authentication'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: RegisterSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: AuthResponseSchema,
        },
      },
      description: 'Registration successful',
    },
    400: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
      description: 'User already exists',
    },
    500: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
      description: 'Internal server error',
    },
  },
});

app.openapi(registerRoute, async (c) => {
  try {
    const data = c.req.valid('json');

    // Check if user exists
    const [existingUser] = await db.select().from(users).where(eq(users.username, data.username));
    if (existingUser) {
      return c.json({ success: false, message: 'Username already exists' }, 400);
    }

    const [existingEmail] = await db.select().from(users).where(eq(users.email, data.email));
    if (existingEmail) {
      return c.json({ success: false, message: 'Email already exists' }, 400);
    }

    const [existingWhatsapp] = await db.select().from(users).where(eq(users.whatsapp, data.whatsapp));
    if (existingWhatsapp) {
      return c.json({ success: false, message: 'Nomor telepon sudah terdaftar' }, 400);
    }

    // Generate password from first name + birth date (DDMMYYYY)
    // Example: "John Doe" + "1990-05-15" = "john15051990"
    const firstName = data.fullName.split(' ')[0].toLowerCase();
    const [year, month, day] = data.birthDate.split('-');
    const rawPassword = `${firstName}${day}${month}${year}`;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // Create user
    const [newUser] = await db.insert(users).values({
      username: data.username,
      email: data.email,
      password: hashedPassword,
      fullName: data.fullName,
      whatsapp: data.whatsapp,
      birthDate: data.birthDate,
      department: data.department || null,
      role: data.role || 'user',
    }).returning();

    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, role: newUser.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    const userResponse = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      fullName: newUser.fullName,
      whatsapp: newUser.whatsapp,
      birthDate: newUser.birthDate,
      department: newUser.department,
      role: newUser.role,
      createdAt: newUser.createdAt?.toISOString() || '',
    };

    return c.json({
      success: true,
      message: 'Registration successful',
      data: { token, user: userResponse, generatedPassword: rawPassword },
    }, 201);
  } catch (error) {
    return c.json({ success: false, message: 'Internal server error' }, 500);
  }
});

export default app;
