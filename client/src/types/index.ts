export interface User {
  id: number;
  username: string;
  nickname: string;
  phone: string;
  avatar: string;
  role: 'driver' | 'rider';
  rating: number;
  rating_count: number;
  created_at?: string;
}

export interface Ride {
  id: number;
  driver_id: number;
  origin: string;
  destination: string;
  departure_time: string;
  car_model: string;
  total_seats: number;
  available_seats: number;
  price_per_person: number;
  description: string;
  status: 'open' | 'full' | 'completed' | 'cancelled';
  created_at: string;
  driver_nickname?: string;
  driver_avatar?: string;
  driver_rating?: number;
  driver_rating_count?: number;
  driver_phone?: string;
}

export interface RideRequest {
  id: number;
  ride_id: number;
  rider_id: number;
  pickup_point: string;
  seats_needed: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  nickname?: string;
  avatar?: string;
  rating?: number;
  phone?: string;
  origin?: string;
  destination?: string;
  departure_time?: string;
  ride_status?: string;
  driver_nickname?: string;
  driver_avatar?: string;
  driver_id?: number;
}

export interface Review {
  id: number;
  ride_id: number;
  reviewer_id: number;
  reviewee_id: number;
  rating: number;
  comment: string;
  created_at: string;
  reviewer_nickname?: string;
  reviewer_avatar?: string;
  origin?: string;
  destination?: string;
  departure_time?: string;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  content: string;
  is_read: number;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export interface RidesListResponse {
  rides: Ride[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RideDetailResponse {
  ride: Ride;
  passengers: Array<{
    id: number;
    rider_id: number;
    pickup_point: string;
    seats_needed: number;
    status: string;
    nickname: string;
    avatar: string;
    rating: number;
  }>;
  pendingCount: number;
  myRequest: RideRequest | null;
  reviews: Review[];
}
