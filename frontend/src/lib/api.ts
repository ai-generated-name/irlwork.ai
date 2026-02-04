import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: { email: string; password: string; name: string; role: string }) =>
    api.post('/api/auth/register', data),
  
  login: (data: { email?: string; password?: string; apiKey?: string }) =>
    api.post('/api/auth/login', data),
  
  me: () => api.get('/api/auth/me'),
  
  regenerateApiKey: (label?: string) =>
    api.post('/api/auth/regenerate-api-key', { label }),
};

// Users API
export const usersAPI = {
  getAll: (params?: Record<string, string>) =>
    api.get('/api/users', { params }),
  
  getById: (id: string) =>
    api.get(`/api/users/${id}`),
  
  updateProfile: (data: Record<string, unknown>) =>
    api.put('/api/users/profile', data),
  
  getReviews: (userId: string) =>
    api.get(`/api/users/${userId}/reviews`),
};

// Jobs API
export const jobsAPI = {
  getAll: (params?: Record<string, string>) =>
    api.get('/api/jobs', { params }),
  
  getById: (id: string) =>
    api.get(`/api/jobs/${id}`),
  
  create: (data: Record<string, unknown>) =>
    api.post('/api/jobs', data),
  
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/jobs/${id}`, data),
  
  accept: (id: string) =>
    api.post(`/api/jobs/${id}/accept`),
  
  complete: (id: string) =>
    api.post(`/api/jobs/${id}/complete`),
  
  cancel: (id: string) =>
    api.post(`/api/jobs/${id}/cancel`),
  
  myJobs: (type?: string) =>
    api.get('/api/jobs/my/jobs', { params: { type } }),
};

// Bookings API
export const bookingsAPI = {
  getAll: (params?: Record<string, string>) =>
    api.get('/api/bookings', { params }),

  create: (data: { jobId: string; scheduledAt: string; duration: number; notes?: string }) =>
    api.post('/api/bookings', data),

  updateStatus: (id: string, status: string) =>
    api.patch(`/api/bookings/${id}/status`, { status }),

  cancel: (id: string) =>
    api.post(`/api/bookings/${id}/cancel`),

  // Video verification
  uploadVideoVerify: (bookingId: string, data: { videoUrl: string; thumbnailUrl?: string; duration?: number }) =>
    api.post(`/api/bookings/${bookingId}/video-verify`, data),

  confirmVideoVerify: (bookingId: string) =>
    api.post(`/api/bookings/${bookingId}/video-verify/confirm`),

  rejectVideoVerify: (bookingId: string, reason?: string) =>
    api.post(`/api/bookings/${bookingId}/video-verify/reject`, { reason }),

  getVideoStatus: (bookingId: string) =>
    api.get(`/api/bookings/${bookingId}/video-status`),
};

// Messages API
export const messagesAPI = {
  getAll: (params?: { jobId?: string; otherUserId?: string }) =>
    api.get('/api/messages', { params }),
  
  send: (data: { receiverId: string; content: string; jobId?: string }) =>
    api.post('/api/messages', data),
  
  markRead: (data: { senderId?: string; jobId?: string }) =>
    api.patch('/api/messages/read', data),
  
  getUnreadCount: () => api.get('/api/messages/unread/count'),
};

// Payments API
export const paymentsAPI = {
  getAll: (params?: Record<string, string>) =>
    api.get('/api/payments', { params }),
  
  createEscrow: (data: { jobId: string; amount: number }) =>
    api.post('/api/payments/escrow', data),
  
  release: (id: string) =>
    api.post(`/api/payments/${id}/release`),
  
  refund: (id: string) =>
    api.post(`/api/payments/${id}/refund`),
};

// Wallet API
export const walletAPI = {
  getBalance: () => api.get('/api/wallet'),
  
  deposit: (amount: number) =>
    api.post('/api/wallet/deposit', { amount }),
  
  withdraw: (amount: number) =>
    api.post('/api/wallet/withdraw', { amount }),
  
  getTransactions: (params?: Record<string, string>) =>
    api.get('/api/wallet/transactions', { params }),
};

// Reviews API
export const reviewsAPI = {
  getForUser: (userId: string) =>
    api.get(`/api/reviews/user/${userId}`),
  
  create: (data: { subjectId: string; jobId: string; rating: number; comment?: string }) =>
    api.post('/api/reviews', data),
  
  update: (id: string, data: { rating?: number; comment?: string }) =>
    api.put(`/api/reviews/${id}`, data),
};

// Search API
export const searchAPI = {
  search: (params: { q: string; type?: string; category?: string }) =>
    api.get('/api/search', { params }),
  
  getCategories: () => api.get('/api/search/categories'),
  
  getSuggestions: (q: string) =>
    api.get('/api/search/suggestions', { params: { q } }),
};

// Verification API
export const verificationAPI = {
  // Submit task proof
  submitProof: (taskId: string, data: { proofType: string; proofText?: string; proofImage?: string }) =>
    api.post(`/api/auth/tasks/${taskId}/submit-proof`, data),
  
  // Agent verifies task completion
  verifyBooking: (bookingId: string, data: { action: 'approve' | 'reject'; rejectReason?: string }) =>
    api.post(`/api/auth/bookings/${bookingId}/verify`, data),
  
  // Get pending verifications (for agents)
  getPendingVerifications: () =>
    api.get('/api/auth/pending-verifications'),
};

// Selfie verification API
export const selfieAPI = {
  upload: async (selfieFile: File) => {
    const formData = new FormData();
    formData.append('selfie', selfieFile);
    
    return api.post('/api/auth/verify/selfie', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export default api;
