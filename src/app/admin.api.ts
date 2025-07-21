/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import type {
  DashboardStats,
  DashboardQueryParams,
  AdminUser,
  GetUsersResponse,
  GetUserByIdResponse,
  UpdateUserRequest,
  UpdateUserRoleRequest,
  AdminResponse,
  UsersQueryParams,
  PaymentQueryParams,
  PaymentStatsResponse,
  PaymentStatsQueryParams,
  UpdatePaymentStatusRequest,
  PaymentDetailResponse,
  PaymentListResponse,
} from "./Admin.type";
import { getAuthToken } from "./user.api";

const BASE_URL = "https://bookmovie-5n6n.onrender.com";

// Create authenticated axios instance for admin requests
const createAdminRequest = () => {
  const token = getAuthToken();
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
};

// Handle admin API errors
const handleAdminError = (error: unknown): Error => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const message = error.response?.data?.message;

    if (status === 401) {
      throw new Error("Unauthorized. Please login as admin.");
    } else if (status === 403) {
      throw new Error("Access denied. Admin privileges required.");
    } else if (status === 404) {
      throw new Error(message || "Resource not found.");
    } else if (status === 400) {
      throw new Error(message || "Invalid request data.");
    } else if (status === 500) {
      throw new Error("Server error. Please try again later.");
    } else {
      throw new Error(message || "Request failed.");
    }
  }
  throw new Error("Network error. Please check your connection.");
};

// ===============================
// DASHBOARD APIS
// ===============================

// Get dashboard statistics
export const getDashboardStats = async (
  params?: DashboardQueryParams
): Promise<DashboardStats> => {
  try {
    const adminApi = createAdminRequest();
    const queryParams = new URLSearchParams();

    if (params?.period) queryParams.append("period", params.period);
    if (params?.start_date) queryParams.append("start_date", params.start_date);
    if (params?.end_date) queryParams.append("end_date", params.end_date);

    const url = `/admin/dashboard${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    const response = await adminApi.get<{ result: DashboardStats }>(url);
    return response.data.result;
  } catch (error) {
    throw handleAdminError(error);
  }
};

// ===============================
// USER MANAGEMENT APIS
// ===============================

// Get all users with pagination and filters
export const getAllUsers = async (
  params?: UsersQueryParams
): Promise<GetUsersResponse> => {
  try {
    const adminApi = createAdminRequest();
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.role) queryParams.append("role", params.role);
    if (params?.sort_by) queryParams.append("sort_by", params.sort_by);
    if (params?.sort_order) queryParams.append("sort_order", params.sort_order);

    const url = `/admin/users${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    const response = await adminApi.get<GetUsersResponse>(url);
    return response.data;
  } catch (error) {
    throw handleAdminError(error);
  }
};

// Get user by ID
export const getUserById = async (userId: string): Promise<AdminUser> => {
  try {
    const adminApi = createAdminRequest();
    const response = await adminApi.get<GetUserByIdResponse>(
      `/admin/users/${userId}`
    );
    return response.data.result;
  } catch (error) {
    throw handleAdminError(error);
  }
};

// Update user information
export const updateUser = async (
  userId: string,
  userData: UpdateUserRequest
): Promise<AdminResponse> => {
  try {
    const adminApi = createAdminRequest();
    const response = await adminApi.put<AdminResponse>(
      `/admin/users/${userId}`,
      userData
    );
    return response.data;
  } catch (error) {
    throw handleAdminError(error);
  }
};

// Update user role
export const updateUserRole = async (
  userId: string,
  roleData: UpdateUserRoleRequest
): Promise<AdminResponse> => {
  try {
    const adminApi = createAdminRequest();
    const response = await adminApi.put<AdminResponse>(
      `/admin/users/${userId}/role`,
      roleData
    );
    return response.data;
  } catch (error) {
    throw handleAdminError(error);
  }
};

// Delete user
export const deleteUser = async (userId: string): Promise<AdminResponse> => {
  try {
    const adminApi = createAdminRequest();
    const response = await adminApi.delete<AdminResponse>(
      `/admin/users/${userId}`
    );
    return response.data;
  } catch (error) {
    throw handleAdminError(error);
  }
};

// Ban/Unban user
export const toggleUserStatus = async (
  userId: string,
  action: "ban" | "unban"
): Promise<AdminResponse> => {
  try {
    const adminApi = createAdminRequest();
    const response = await adminApi.put<AdminResponse>(
      `/admin/users/${userId}/${action}`
    );
    return response.data;
  } catch (error) {
    throw handleAdminError(error);
  }
};

// Promote user to staff with contract
export const promoteUserToStaff = async (
  userId: string,
  contractData: {
    position: string;
    salary: number;
    start_date: string;
    end_date: string;
    contract_type: "full_time" | "part_time" | "contract";
    benefits: string[];
    terms: string;
  }
): Promise<{
  message: string;
  result: {
    user_id: string;
    contract_id: string;
  };
}> => {
  try {
    const adminApi = createAdminRequest();
    const response = await adminApi.put(
      `/admin/users/${userId}/promote-to-staff`,
      contractData
    );
    return response.data;
  } catch (error) {
    throw handleAdminError(error);
  }
};

// ===============================
// ADMIN UTILITY FUNCTIONS
// ===============================

// Check if user has admin privileges
export const checkAdminPrivileges = async (): Promise<boolean> => {
  try {
    const adminApi = createAdminRequest();
    await adminApi.get("/admin/dashboard");
    return true;
  } catch (error) {
    console.log("Admin privileges check failed:", error);

    return false;
  }
};

// Export users data (CSV format)
export const exportUsersData = async (
  params?: UsersQueryParams
): Promise<Blob> => {
  try {
    const adminApi = createAdminRequest();
    const queryParams = new URLSearchParams();

    if (params?.search) queryParams.append("search", params.search);
    if (params?.role) queryParams.append("role", params.role);

    const url = `/admin/users/export${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    const response = await adminApi.get(url, {
      responseType: "blob",
    });

    return response.data;
  } catch (error) {
    throw handleAdminError(error);
  }
};

// Get user activity logs
export const getUserActivityLogs = async (
  userId: string,
  limit = 50
): Promise<any[]> => {
  try {
    const adminApi = createAdminRequest();
    const response = await adminApi.get(
      `/admin/users/${userId}/activity?limit=${limit}`
    );
    return response.data.result || [];
  } catch (error) {
    throw handleAdminError(error);
  }
};

// Send notification to user
export const sendNotificationToUser = async (
  userId: string,
  notification: {
    title: string;
    message: string;
    type?: "info" | "warning" | "success" | "error";
  }
): Promise<AdminResponse> => {
  try {
    const adminApi = createAdminRequest();
    const response = await adminApi.post<AdminResponse>(
      `/admin/users/${userId}/notify`,
      notification
    );
    return response.data;
  } catch (error) {
    throw handleAdminError(error);
  }
};

// Bulk operations
export const bulkUpdateUsers = async (
  userIds: string[],
  updates: Partial<UpdateUserRequest>
): Promise<AdminResponse> => {
  try {
    const adminApi = createAdminRequest();
    const response = await adminApi.put<AdminResponse>(
      "/admin/users/bulk-update",
      {
        userIds,
        updates,
      }
    );
    return response.data;
  } catch (error) {
    throw handleAdminError(error);
  }
};

export const bulkDeleteUsers = async (
  userIds: string[]
): Promise<AdminResponse> => {
  try {
    const adminApi = createAdminRequest();
    const response = await adminApi.delete<AdminResponse>(
      "/admin/users/bulk-delete",
      {
        data: { userIds },
      }
    );
    return response.data;
  } catch (error) {
    throw handleAdminError(error);
  }
};

// ===============================
// CONTRACT MANAGEMENT APIS
// ===============================

// Get all contracts with pagination and filters
export const getAllContracts = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}): Promise<{
  message: string;
  result: {
    contracts: Array<{
      _id: string;
      staff_id: string;
      admin_id: string;
      contract_number: string;
      staff_name: string | null;
      staff_email: string | null;
      staff_phone: string | null;
      theater_name: string | null;
      theater_location: string | null;
      salary: number;
      start_date: string;
      end_date: string;
      status: "draft" | "active" | "terminated" | "expired";
      terms: string;
      responsibilities: string[];
      benefits: string[];
      contract_file_url: string;
      notes: string;
      created_at: string;
      updated_at: string;
      staff: {
        _id: string;
        email: string;
        name: string;
        avatar: string;
        phone?: string;
      };
      admin: {
        _id: string;
        email: string;
        name: string;
      };
    }>;
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}> => {
  try {
    const adminApi = createAdminRequest();
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.sort_by) queryParams.append("sort_by", params.sort_by);
    if (params?.sort_order) queryParams.append("sort_order", params.sort_order);

    const url = `/admin/contracts${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    const response = await adminApi.get(url);
    return response.data;
  } catch (error) {
    throw handleAdminError(error);
  }
};

// Get contract by ID
export const getContractById = async (
  contractId: string
): Promise<{
  message: string;
  result: {
    _id: string;
    staff_id: string;
    admin_id: string;
    contract_number: string;
    staff_name: string | null;
    staff_email: string | null;
    staff_phone: string | null;
    theater_name: string | null;
    theater_location: string | null;
    salary: number;
    start_date: string;
    end_date: string;
    status: "draft" | "active" | "terminated" | "expired";
    terms: string;
    responsibilities: string[];
    benefits: string[];
    contract_file_url: string;
    notes: string;
    created_at: string;
    updated_at: string;
    staff: {
      _id: string;
      email: string;
      name: string;
      avatar: string;
      phone?: string;
    };
    admin: {
      _id: string;
      email: string;
      name: string;
    };
  };
}> => {
  try {
    const adminApi = createAdminRequest();
    const response = await adminApi.get(`/admin/contracts/${contractId}`);
    return response.data;
  } catch (error) {
    throw handleAdminError(error);
  }
};

// Update contract
export const updateContract = async (
  contractId: string,
  contractData: {
    position?: string;
    salary?: number;
    contract_type?: "full_time" | "part_time" | "contract";
    start_date?: string;
    end_date?: string;
    benefits?: string[];
    terms?: string;
  }
): Promise<{
  message: string;
  result: {
    contract_id: string;
  };
}> => {
  try {
    const adminApi = createAdminRequest();
    const response = await adminApi.put(
      `/admin/contracts/${contractId}`,
      contractData
    );
    return response.data;
  } catch (error) {
    throw handleAdminError(error);
  }
};

// Activate contract
export const activateContract = async (
  contractId: string
): Promise<{
  message: string;
  result: {
    contract_id: string;
  };
}> => {
  try {
    const adminApi = createAdminRequest();
    const response = await adminApi.put(
      `/admin/contracts/${contractId}/activate`
    );
    return response.data;
  } catch (error) {
    throw handleAdminError(error);
  }
};

// Terminate contract
export const terminateContract = async (
  contractId: string,
  reason: string
): Promise<{
  message: string;
  result: {
    contract_id: string;
  };
}> => {
  try {
    const adminApi = createAdminRequest();
    const response = await adminApi.put(
      `/admin/contracts/${contractId}/terminate`,
      { reason }
    );
    return response.data;
  } catch (error) {
    throw handleAdminError(error);
  }
};

// Check for expired contracts
export const checkExpiredContracts = async (): Promise<{
  message: string;
  result: {
    expired_count: number;
  };
}> => {
  try {
    const adminApi = createAdminRequest();
    const response = await adminApi.post("/admin/contracts/check-expired");
    return response.data;
  } catch (error) {
    throw handleAdminError(error);
  }
};

// Check staff contract for admin purposes
export const checkStaffContractAdmin = async (
  staffId: string
): Promise<{
  message: string;
  result: any;
}> => {
  try {
    const adminApi = createAdminRequest();
    const response = await adminApi.get(
      `/admin/contracts/check-staff/${staffId}`
    );
    return response.data;
  } catch (error) {
    throw handleAdminError(error);
  }
};
export const getAllPayments = async (
  params?: PaymentQueryParams
): Promise<PaymentListResponse> => {
  try {
    const adminApi = createAdminRequest();
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.status) queryParams.append("status", params.status);
    if (params?.payment_method)
      queryParams.append("payment_method", params.payment_method);
    if (params?.sort_by) queryParams.append("sort_by", params.sort_by);
    if (params?.sort_order) queryParams.append("sort_order", params.sort_order);
    if (params?.date_from) queryParams.append("date_from", params.date_from);
    if (params?.date_to) queryParams.append("date_to", params.date_to);
    if (params?.search) queryParams.append("search", params.search);

    const url = `/admin/payments${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    const response = await adminApi.get<PaymentListResponse>(url);
    return response.data;
  } catch (error) {
    throw handleAdminError(error);
  }
};

// Get payment by ID
export const getPaymentById = async (
  paymentId: string
): Promise<PaymentDetailResponse> => {
  try {
    const adminApi = createAdminRequest();
    const response = await adminApi.get<PaymentDetailResponse>(
      `/admin/payments/${paymentId}`
    );
    return response.data;
  } catch (error) {
    throw handleAdminError(error);
  }
};

// Update payment status
export const updatePaymentStatus = async (
  paymentId: string,
  data: UpdatePaymentStatusRequest
): Promise<AdminResponse> => {
  try {
    const adminApi = createAdminRequest();
    const response = await adminApi.put<AdminResponse>(
      `/admin/payments/${paymentId}/status`,
      data
    );
    return response.data;
  } catch (error) {
    throw handleAdminError(error);
  }
};

// Get payment statistics
export const getPaymentStats = async (
  params?: PaymentStatsQueryParams
): Promise<PaymentStatsResponse> => {
  try {
    const adminApi = createAdminRequest();
    const queryParams = new URLSearchParams();

    if (params?.period) queryParams.append("period", params.period);
    if (params?.start_date) queryParams.append("start_date", params.start_date);
    if (params?.end_date) queryParams.append("end_date", params.end_date);

    const url = `/admin/payments/stats${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    const response = await adminApi.get<PaymentStatsResponse>(url);
    return response.data;
  } catch (error) {
    throw handleAdminError(error);
  }
};

// Bulk update payment status
export const bulkUpdatePaymentStatus = async (
  paymentIds: string[],
  status: string
): Promise<AdminResponse> => {
  try {
    const adminApi = createAdminRequest();
    const response = await adminApi.put<AdminResponse>(
      "/admin/payments/bulk-update-status",
      {
        paymentIds,
        status,
      }
    );
    return response.data;
  } catch (error) {
    throw handleAdminError(error);
  }
};

// Export payment data
export const exportPaymentData = async (
  params?: PaymentQueryParams
): Promise<Blob> => {
  try {
    const adminApi = createAdminRequest();
    const queryParams = new URLSearchParams();

    if (params?.status) queryParams.append("status", params.status);
    if (params?.payment_method)
      queryParams.append("payment_method", params.payment_method);
    if (params?.date_from) queryParams.append("date_from", params.date_from);
    if (params?.date_to) queryParams.append("date_to", params.date_to);

    const url = `/admin/payments/export${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    const response = await adminApi.get(url, {
      responseType: "blob",
    });

    return response.data;
  } catch (error) {
    throw handleAdminError(error);
  }
};
export const verifyTicketCode = async (
  ticketCode: string
): Promise<{
  message: string;
  result: {
    booking_id: string;
    ticket_code: string;
    status: string;
    payment_status: string;

    booking_time: string;
    verified_at: string;
  };
}> => {
  try {
    const adminApi = createAdminRequest();
    const response = await adminApi.post(`/users/verify-ticket`, {
      ticket_code: ticketCode,
    });
    return response.data;
  } catch (error) {
    throw handleAdminError(error);
  }
};
