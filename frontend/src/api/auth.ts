import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({ baseURL: BASE_URL, withCredentials: true });

export interface User {
  email: string;
  name: string;
  _id: string;
}

export interface AuthResponse {
  user: User;
}

export const signUp = (data: { email: string; name: string; password: string }) =>
  api.post<AuthResponse>('/auth/signup', data).then((r) => r.data);

export const signIn = (data: { email: string; password: string }) =>
  api.post<AuthResponse>('/auth/signin', data).then((r) => r.data);

export const getMe = () => api.get<{ user: User }>('/auth/me').then((r) => r.data.user);

export const logout = () => api.post('/auth/logout');

export default api;
