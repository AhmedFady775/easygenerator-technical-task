import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({ baseURL: BASE_URL, withCredentials: true });

// Attach access token from memory store on every request
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── In-memory access token store (never touches localStorage) ────────────────
// Refresh token lives in the httpOnly cookie — JS cannot read it.
let _accessToken: string | null = null;

export const getAccessToken = () => _accessToken;
export const setAccessToken = (t: string | null) => { _accessToken = t; };

// ── Silent refresh ────────────────────────────────────────────────────────────
let refreshPromise: Promise<string | null> | null = null;

async function silentRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = axios
    .post<{ accessToken: string }>(
      `${BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true },
    )
    .then(({ data }) => {
      setAccessToken(data.accessToken);
      return data.accessToken;
    })
    .catch(() => {
      setAccessToken(null);
      return null;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

// ── 401 → attempt silent refresh, replay original request ────────────────────
api.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);

    const originalReq = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    const is401 = error.response?.status === 401;
    const isRefreshEndpoint = originalReq?.url?.includes('/auth/refresh');
    const alreadyRetried = originalReq?._retry;

    if (is401 && !isRefreshEndpoint && !alreadyRetried && originalReq) {
      originalReq._retry = true;
      const newToken = await silentRefresh();
      if (newToken) {
        originalReq.headers = originalReq.headers ?? {};
        originalReq.headers.Authorization = `Bearer ${newToken}`;
        return api(originalReq);
      }
    }

    return Promise.reject(error);
  },
);

// ── Typed API calls ───────────────────────────────────────────────────────────
export interface User {
  email: string;
  name: string;
  _id: string;
}

export interface SignInResponse {
  accessToken: string;
  user: User;
}

export const signUp = (data: { email: string; name: string; password: string }) =>
  api.post<SignInResponse>('/auth/signup', data).then((r) => r.data);

export const signIn = (data: { email: string; password: string }) =>
  api.post<SignInResponse>('/auth/signin', data).then((r) => r.data);

export const logout = () => api.post('/auth/logout').then(() => setAccessToken(null));

export default api;
