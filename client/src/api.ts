const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${url}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  login: (data: { username: string; password: string }) =>
    request<{ message: string; token: string; user: import('./types').User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  register: (data: { username: string; password: string; nickname: string; phone?: string; role?: string }) =>
    request<{ message: string; token: string; user: import('./types').User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMe: () =>
    request<{ user: import('./types').User }>('/auth/me'),

  updateProfile: (data: { nickname: string; phone: string }) =>
    request<{ message: string; user: import('./types').User }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Rides
  getRides: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<import('./types').RidesListResponse>(`/rides${qs}`);
  },

  getRideDetail: (id: number) =>
    request<import('./types').RideDetailResponse>(`/rides/${id}`),

  createRide: (data: {
    origin: string;
    destination: string;
    departure_time: string;
    car_model: string;
    total_seats: number;
    price_per_person: number;
    description?: string;
  }) =>
    request<{ message: string; ride: { id: number } }>('/rides', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  cancelRide: (id: number) =>
    request<{ message: string }>(`/rides/${id}/cancel`, { method: 'PUT' }),

  completeRide: (id: number) =>
    request<{ message: string }>(`/rides/${id}/complete`, { method: 'PUT' }),

  // Requests
  applyRide: (data: { ride_id: number; pickup_point: string; seats_needed?: number }) =>
    request<{ message: string; request: { id: number } }>('/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getRideRequests: (rideId: number) =>
    request<{ requests: import('./types').RideRequest[] }>(`/requests/ride/${rideId}`),

  updateRequestStatus: (requestId: number, status: 'approved' | 'rejected') =>
    request<{ message: string }>(`/requests/${requestId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  getMyRequests: () =>
    request<{ requests: import('./types').RideRequest[] }>('/requests/my'),

  // Reviews
  createReview: (data: { ride_id: number; reviewee_id: number; rating: number; comment?: string }) =>
    request<{ message: string }>('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getReviewsByUser: (userId: number) =>
    request<{ reviews: import('./types').Review[] }>(`/reviews/user/${userId}`),

  getReviewsByRide: (rideId: number) =>
    request<{ reviews: import('./types').Review[] }>(`/reviews/ride/${rideId}`),

  // Notifications
  getNotifications: () =>
    request<{ notifications: import('./types').Notification[]; unreadCount: number }>('/notifications'),

  markNotifRead: (id: number) =>
    request<{ message: string }>(`/notifications/${id}/read`, { method: 'PUT' }),

  markAllRead: () =>
    request<{ message: string }>('/notifications/read-all', { method: 'PUT' }),
};
