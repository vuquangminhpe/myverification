export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  username: string;
  role: "staff" | "admin" | "customer";
  verify: number; // 0=unverified, 1=verified, 2=banned 
  avatar: string;
  created_at: string;
  updated_at: string;
  date_of_birth?: string;
  address?: Address;
  phone?: string;
  bio?: string;
  cover_photo?: string;
  location?: string;
  website?: string;
  email_verify_code?: string;
  verify_code_expires_at?: string | null;
}

export interface LoginResponse {
  message: string;
  result: {
    access_token: string;
    user: User;
  };
}

export interface RegisterResponse {
  message: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export interface UserLoginType {
  email: string;
  password: string;
}

export interface RegisterUserType {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
  date_of_birth: string;
  address: Address;
  phone: string;
}

export interface OtpRegisterType {
  email: string;
  otpVerify: string;
}

export interface UpdateProfileRequest {
  name?: string;
  date_of_birth?: string;
  bio?: string;
  location?: string;
  website?: string;
  username?: string;
  avatar?: string;
  cover_photo?: string;
  address?: Address;
  phone?: string;
}

export interface UpdateProfileResponse {
  message: string;
  result: User;
}

export interface GetProfileResponse {
  message: string;
  result: User;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
  confirm_new_password: string;
}

export interface ChangePasswordResponse {
  message: string;
}

