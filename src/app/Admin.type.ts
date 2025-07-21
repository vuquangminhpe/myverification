/* eslint-disable @typescript-eslint/no-explicit-any */
// Admin related types
export interface DashboardStats {
  period: string;
  user_stats: {
    total_users: number;
    new_users: number;
  };
  hr_stats: {
    total_contracts: number;
    total_staff: number;
  };
  booking_stats: {
    total_bookings: number;
    completed_bookings: number;
    revenue: number;
    revenue_by_status: Array<{
      _id: string;
      total: number;
    }>;
  };
  content_stats: {
    total_movies: number;
    total_theaters: number;
    total_screens: number;
    total_ratings: number;
    total_feedbacks: number;
  };
  charts: {
    bookings_per_day: Array<{
      date: string;
      bookings: number;
      revenue: number;
    }>;
  };
  top_performers: {
    top_movies: Array<{
      _id: string;
      bookings_count: number;
      revenue: number;
      movie_id: string;
      title: string;
      poster_url: string;
    }>;
    top_theaters: Array<{
      _id: string;
      bookings_count: number;
      revenue: number;
      theater_id: string;
      name: string;
      location: string;
    }>;
  };
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  username?: string;
  avatar?: string;
  phone?: string;
  role: "admin" | "customer" | "staff";
  verify: number; // 0: not verified, 1: verified, 2: banned
  date_of_birth?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  created_at: string;
  updated_at: string;
  email_verify_code?: string;
  verify_code_expires_at?: string | null;
  class?: string;
  stats: {
    bookings_count: number;
    ratings_count: number;
    feedbacks_count: number;
    total_spent?: number;
  };
  recent_activity?: {
    recent_bookings: any[];
    recent_ratings: any[];
    recent_feedbacks: any[];
  };
}

export interface GetUsersResponse {
  message: string;
  result: {
    users: AdminUser[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface GetUserByIdResponse {
  message: string;
  result: AdminUser;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
}

export interface UpdateUserRoleRequest {
  role: "admin" | "customer" | "staff";
}

export interface AdminResponse {
  message: string;
  result?: any;
}

export interface UsersQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  sort_by?: "name" | "email" | "created_at";
  sort_order?: "asc" | "desc";
}

// Dashboard query parameters
export interface DashboardQueryParams {
  period?: "today" | "week" | "month" | "year" | "all";
  start_date?: string; // Format: YYYY-MM-DD
  end_date?: string; // Format: YYYY-MM-DD
}
export interface PaymentQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  payment_method?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface PaymentStatsQueryParams {
  period?: "today" | "week" | "month" | "year" | "all";
  start_date?: string;
  end_date?: string;
}

export interface UpdatePaymentStatusRequest {
  status: "pending" | "completed" | "failed" | "refunded";
  transaction_id?: string;
  admin_note?: string;
}

export interface AdminPayment {
  _id: string;
  user_id: string;
  booking_id: string;
  amount: number;
  payment_method: string;
  status: string;
  transaction_id: string;
  payment_time: string;
  admin_note?: string;
  created_at: string;
  updated_at: string;
  user: {
    _id: string;
    name: string;
    email: string;
    username: string;
  } | null;
  booking: {
    _id: string;
    ticket_code: string;
    status: string;
    payment_status: string;
    total_amount: number;
    seats: number;
  } | null;
  movie: {
    _id: string;
    title: string;
    poster_url: string;
  } | null;
  theater: {
    _id: string;
    name: string;
    location: string;
  } | null;
  showtime: {
    _id: string;
    start_time: string;
    end_time: string;
  } | null;
}

export interface PaymentDetailResponse {
  message: string;
  result: AdminPayment & {
    screen: {
      _id: string;
      name: string;
    } | null;
  };
}

export interface PaymentListResponse {
  message: string;
  result: {
    payments: AdminPayment[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface PaymentStats {
  period: string;
  overview: {
    total_payments: number;
    completed_payments: number;
    pending_payments: number;
    failed_payments: number;
    refunded_payments: number;
    total_revenue: number;
  };
  payment_methods: Array<{
    _id: string;
    count: number;
    amount: number;
  }>;
  payment_status: Array<{
    _id: string;
    count: number;
    amount: number;
  }>;
  payment_trends: Array<{
    date: string;
    total_payments: number;
    total_amount: number;
    completed_payments: number;
    completed_amount: number;
  }>;
}

export interface PaymentStatsResponse {
  message: string;
  result: PaymentStats;
}
