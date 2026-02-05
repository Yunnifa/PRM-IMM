import api from './api';

/**
 * =============================================================================
 * INTERFACES / TYPES
 * =============================================================================
 * Semua type definitions di sini agar tidak perlu filtering di params
 * Best practice: Type definitions di initiator, bukan di service layer
 */

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  whatsapp: string | null;
  department: string | null;
  role: string;
  createdAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
  whatsapp?: string;
  department?: string;
  role?: 'admin' | 'head_ga' | 'head_os' | 'user';
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: User;
  };
}

export interface Department {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  id: number;
  name: string;
  capacity: number;
  location: string | null;
  isHybrid: number;
  description: string | null;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

export interface Facility {
  id: number;
  name: string;
  description: string | null;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingRequestHistory {
  timestamp: string;
  action: string;
  by: string;
  whatsapp: string | null;
  status: 'submitted' | 'approved' | 'rejected';
  notes: string | null;
}

export interface MeetingRequest {
  id: number;
  requestId: string;
  nama: string;
  whatsapp: string;
  department: string;
  tanggal: string;
  hari: string;
  jamMulai: string;
  jamBerakhir: string;
  jumlahPeserta: number;
  agenda: string;
  namaRuangan: string;
  fasilitas: string;
  headGA: 'pending' | 'approved' | 'rejected';
  headOS: 'pending' | 'approved' | 'rejected';
  history: MeetingRequestHistory[];
  createdAt: string;
}

// Input types - untuk create/update operations
export interface CreateDepartmentInput {
  name: string;
  description?: string;
}

export interface UpdateDepartmentInput {
  name?: string;
  description?: string;
}

export interface CreateRoomInput {
  name: string;
  capacity: number;
  location?: string;
  description?: string;
  isHybrid?: number;
}

export interface UpdateRoomInput {
  name?: string;
  capacity?: number;
  location?: string;
  description?: string;
  isHybrid?: number;
}

export interface CreateFacilityInput {
  name: string;
  description?: string;
}

export interface UpdateFacilityInput {
  name?: string;
  description?: string;
}

export interface CreateMeetingRequestInput {
  userId: number;
  nama: string;
  whatsapp: string;
  department: string;
  tanggal: string;
  hari: string;
  jamMulai: string;
  jamBerakhir: string;
  jumlahPeserta: number;
  agenda: string;
  namaRuangan: string;
  fasilitas: string;
}

export interface UpdateMeetingRequestInput {
  nama?: string;
  whatsapp?: string;
  department?: string;
  tanggal?: string;
  hari?: string;
  jamMulai?: string;
  jamBerakhir?: string;
  jumlahPeserta?: number;
  agenda?: string;
  namaRuangan?: string;
  fasilitas?: string;
}

export interface UpdateApprovalInput {
  type: 'approveGA' | 'rejectGA' | 'approveOS' | 'rejectOS';
  notes?: string;
}

export interface UpdateUserInput {
  username?: string;
  email?: string;
  fullName?: string;
  whatsapp?: string;
  department?: string;
  role?: 'admin' | 'head_ga' | 'head_os' | 'user';
}

/**
 * =============================================================================
 * API REQUEST WRAPPER
 * =============================================================================
 * Best practice: Gunakan try-catch-finally untuk semua API calls
 */

/**
 * Generic API call wrapper dengan try-catch-finally
 * @param apiCall - Function yang mengembalikan Promise dari axios call
 * @param extractData - Apakah mengekstrak .data.data dari response (default: true)
 * @returns Data dari response
 */
async function apiRequest<T>(
  apiCall: () => Promise<any>,
  extractData: boolean = true
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const response = await apiCall();
    
    // Extract data based on flag
    if (extractData) {
      return response.data.data ?? response.data;
    }
    return response.data;
  } catch (error: any) {
    // Extract error message from various possible locations
    const message = error.response?.data?.message 
      || error.response?.data?.error 
      || error.message 
      || 'Terjadi kesalahan pada server';
    
    // Log error for debugging
    console.error('[API Error]', {
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      status: error.response?.status,
      message,
      timestamp: new Date().toISOString(),
    });
    
    throw new Error(message);
  } finally {
    const duration = Date.now() - startTime;
    
    // Debug log in development
    if (import.meta.env.DEV) {
      console.debug(`[API Request Complete] Duration: ${duration}ms`);
    }
  }
}

/**
 * =============================================================================
 * AUTH SERVICE
 * =============================================================================
 */
export const authService = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    return apiRequest<AuthResponse>(() => api.post('/auth/login', data), false);
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    return apiRequest<AuthResponse>(() => api.post('/auth/register', data), false);
  },
};

/**
 * =============================================================================
 * USER SERVICE
 * =============================================================================
 */
export const userService = {
  getAll: async (): Promise<User[]> => {
    return apiRequest<User[]>(() => api.get('/users'));
  },

  getById: async (id: number): Promise<User> => {
    return apiRequest<User>(() => api.get(`/users/${id}`));
  },

  update: async (id: number, data: UpdateUserInput): Promise<User> => {
    return apiRequest<User>(() => api.patch(`/users/${id}`, data));
  },

  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(() => api.delete(`/users/${id}`));
  },

  bulkDelete: async (ids: number[]): Promise<void> => {
    return apiRequest<void>(() => api.post('/users/bulk-delete', { ids }));
  },
};

/**
 * =============================================================================
 * DEPARTMENT SERVICE
 * =============================================================================
 */
export const departmentService = {
  getAll: async (): Promise<Department[]> => {
    return apiRequest<Department[]>(() => api.get('/departments'));
  },

  getById: async (id: number): Promise<Department> => {
    return apiRequest<Department>(() => api.get(`/departments/${id}`));
  },

  create: async (data: CreateDepartmentInput): Promise<Department> => {
    return apiRequest<Department>(() => api.post('/departments', data));
  },

  update: async (id: number, data: UpdateDepartmentInput): Promise<Department> => {
    return apiRequest<Department>(() => api.patch(`/departments/${id}`, data));
  },

  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(() => api.delete(`/departments/${id}`));
  },

  bulkDelete: async (ids: number[]): Promise<void> => {
    return apiRequest<void>(() => api.post('/departments/bulk-delete', { ids }));
  },
};

/**
 * =============================================================================
 * ROOM SERVICE
 * =============================================================================
 */
export const roomService = {
  getAll: async (): Promise<Room[]> => {
    return apiRequest<Room[]>(() => api.get('/rooms'));
  },

  getById: async (id: number): Promise<Room> => {
    return apiRequest<Room>(() => api.get(`/rooms/${id}`));
  },

  create: async (data: CreateRoomInput): Promise<Room> => {
    return apiRequest<Room>(() => api.post('/rooms', data));
  },

  update: async (id: number, data: UpdateRoomInput): Promise<Room> => {
    return apiRequest<Room>(() => api.patch(`/rooms/${id}`, data));
  },

  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(() => api.delete(`/rooms/${id}`));
  },

  bulkDelete: async (ids: number[]): Promise<void> => {
    return apiRequest<void>(() => api.post('/rooms/bulk-delete', { ids }));
  },
};

/**
 * =============================================================================
 * FACILITY SERVICE
 * =============================================================================
 */
export const facilityService = {
  getAll: async (): Promise<Facility[]> => {
    return apiRequest<Facility[]>(() => api.get('/facilities'));
  },

  getById: async (id: number): Promise<Facility> => {
    return apiRequest<Facility>(() => api.get(`/facilities/${id}`));
  },

  create: async (data: CreateFacilityInput): Promise<Facility> => {
    return apiRequest<Facility>(() => api.post('/facilities', data));
  },

  update: async (id: number, data: UpdateFacilityInput): Promise<Facility> => {
    return apiRequest<Facility>(() => api.patch(`/facilities/${id}`, data));
  },

  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(() => api.delete(`/facilities/${id}`));
  },

  bulkDelete: async (ids: number[]): Promise<void> => {
    return apiRequest<void>(() => api.post('/facilities/bulk-delete', { ids }));
  },
};

/**
 * =============================================================================
 * MEETING REQUEST SERVICE
 * =============================================================================
 */
export const meetingRequestService = {
  getAll: async (): Promise<MeetingRequest[]> => {
    return apiRequest<MeetingRequest[]>(() => api.get('/meeting-requests'));
  },

  getById: async (id: number): Promise<MeetingRequest> => {
    return apiRequest<MeetingRequest>(() => api.get(`/meeting-requests/${id}`));
  },

  create: async (data: CreateMeetingRequestInput): Promise<MeetingRequest> => {
    return apiRequest<MeetingRequest>(() => api.post('/meeting-requests', data));
  },

  update: async (id: number, data: UpdateMeetingRequestInput): Promise<MeetingRequest> => {
    return apiRequest<MeetingRequest>(() => api.patch(`/meeting-requests/${id}`, data));
  },

  updateApproval: async (id: number, data: UpdateApprovalInput): Promise<MeetingRequest> => {
    return apiRequest<MeetingRequest>(() => api.patch(`/meeting-requests/${id}/approval`, data));
  },

  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(() => api.delete(`/meeting-requests/${id}`));
  },

  bulkDelete: async (ids: number[]): Promise<void> => {
    return apiRequest<void>(() => api.post('/meeting-requests/bulk-delete', { ids }));
  },
};
