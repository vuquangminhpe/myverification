import axios from "axios";
import type {
  LoginResponse,
  RegisterResponse,
  RegisterUserType,
  UserLoginType,
  OtpRegisterType,
  GetProfileResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
} from "./User.type";

const BASE_URL = "https://bookmovie-5n6n.onrender.com";

// API for user registration
export const registerUser = async (userData: RegisterUserType) => {
  try {
    const response = await axios.post<RegisterResponse>(
      `${BASE_URL}/users/register`,
      userData
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Check if it's a network error or server error
      if (error.code === "NETWORK_ERROR" || !error.response) {
        throw new Error(
          "Network error. Please check your internet connection."
        );
      }

      // Handle different status codes
      const status = error.response?.status;
      const message = error.response?.data?.message;

      if (status === 400) {
        throw new Error(
          message || "Invalid registration data. Please check your information."
        );
      } else if (status === 409) {
        throw new Error(
          message || "Email already exists. Please use a different email."
        );
      } else if (status === 500) {
        throw new Error("Server error. Please try again later.");
      } else {
        throw new Error(
          message || "Failed to send verification email. Please try again."
        );
      }
    }
    throw new Error("Failed to send verification email. Please try again.");
  }
};

// API for OTP verification after registration
export const verifyRegistration = async ({
  email,
  otpVerify,
}: OtpRegisterType) => {
  try {
    const response = await axios.post(`${BASE_URL}/users/verify-registration`, {
      email,
      code: otpVerify,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "OTP verification failed"
      );
    }
    throw new Error("OTP verification failed");
  }
};

// API for user login
export const loginUser = async (credentials: UserLoginType) => {
  try {
    const response = await axios.post<LoginResponse>(
      `${BASE_URL}/users/login`,
      credentials
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || "Login failed");
    }
    throw new Error("Login failed");
  }
};

// API for resending OTP verification code
export const resendOtpCode = async (email: string) => {
  try {
    const response = await axios.post(`${BASE_URL}/users/resend-otp`, {
      email,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.message;

      if (status === 404) {
        throw new Error("Email not found. Please register first.");
      } else if (status === 429) {
        throw new Error(
          "Too many requests. Please wait before requesting a new code."
        );
      } else {
        throw new Error(message || "Failed to send verification code");
      }
    }
    throw new Error("Failed to send verification code");
  }
};

// API to get current user profile
export const getUserProfile = async () => {
  try {
    const authenticatedAxios = createAuthenticatedRequest();
    const response = await authenticatedAxios.get<GetProfileResponse>(
      "/users/me"
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.message;

      if (status === 401) {
        throw new Error("Unauthorized. Please login again.");
      } else if (status === 404) {
        throw new Error("User not found.");
      } else {
        throw new Error(message || "Failed to get user profile");
      }
    }
    throw new Error("Failed to get user profile");
  }
};

// API to get user profile by ID
// This endpoint allows fetching any user's profile information by their ID
// Requires authentication and appropriate permissions
export const getUserProfileById = async (userId: string) => {
  try {
    const authenticatedAxios = createAuthenticatedRequest();
    const response = await authenticatedAxios.get(`/users/profile/${userId}`);
    return response.data; // Return the user data directly since it's not wrapped in result
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.message;

      if (status === 401) {
        throw new Error("Unauthorized. Please login again.");
      } else if (status === 404) {
        throw new Error("User not found.");
      } else if (status === 403) {
        throw new Error("Access denied. Insufficient privileges.");
      } else {
        throw new Error(message || "Failed to get user profile");
      }
    }
    throw new Error("Failed to get user profile");
  }
};

// API to update current user profile
export const updateUserProfile = async (profileData: UpdateProfileRequest) => {
  try {
    const authenticatedAxios = createAuthenticatedRequest();
    const response = await authenticatedAxios.patch<UpdateProfileResponse>(
      "/users/me",
      profileData
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.message;

      if (status === 400) {
        throw new Error(
          message || "Invalid profile data. Please check your information."
        );
      } else if (status === 401) {
        throw new Error("Unauthorized. Please login again.");
      } else if (status === 409) {
        throw new Error(
          message ||
            "Username already exists. Please choose a different username."
        );
      } else {
        throw new Error(message || "Failed to update profile");
      }
    }
    throw new Error("Failed to update profile");
  }
};

// API to change user password
export const changeUserPassword = async (
  passwordData: ChangePasswordRequest
) => {
  try {
    const authenticatedAxios = createAuthenticatedRequest();
    const response = await authenticatedAxios.post<ChangePasswordResponse>(
      "/users/change-password",
      passwordData
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.message;

      if (status === 400) {
        throw new Error(
          message || "Invalid password data. Please check your passwords."
        );
      } else if (status === 401) {
        throw new Error("Unauthorized or incorrect old password.");
      } else if (status === 422) {
        throw new Error(
          message ||
            "Password validation failed. Please check password requirements."
        );
      } else {
        throw new Error(message || "Failed to change password");
      }
    }
    throw new Error("Failed to change password");
  }
};

// Helper function to store authentication tokens
export const storeAuthToken = (accessToken: string) => {
  localStorage.setItem("accessToken", accessToken);
};

// Helper function to get the stored authentication token
export const getAuthToken = () => {
  return localStorage.getItem("accessToken");
};

// Helper function to remove the authentication token (logout)
export const removeAuthToken = () => {
  localStorage.removeItem("accessToken");
};

// Create authenticated axios instance with token
export const createAuthenticatedRequest = () => {
  const token = getAuthToken();
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};
