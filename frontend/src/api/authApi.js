import axiosInstance from './axiosInstance';

const AUTH_BASE = '/api/auth';

/**
 * Register a new user
 * @param {object} data - { name, email, password, city, mobileNumber }
 * @returns {Promise<{user, accessToken, refreshToken}>}
 */
export const register = (data) =>
  axiosInstance.post(`${AUTH_BASE}/register`, data).then((res) => res.data);

/**
 * Login user
 * @param {object} data - { email, password }
 * @returns {Promise<{user, accessToken, refreshToken}>}
 */
export const login = async (data) => {
  const response = await axiosInstance.post(`${AUTH_BASE}/login`, data);
  const { accessToken, refreshToken, user } = response.data;

  // Store tokens and user in localStorage
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  localStorage.setItem('user', JSON.stringify(user));

  return response.data;
};

/**
 * Refresh access token
 * @param {string} refreshToken - Refresh token from localStorage
 * @returns {Promise<{accessToken, refreshToken}>}
 */
export const refreshToken = (rt = localStorage.getItem('refreshToken')) =>
  axiosInstance
    .post(`${AUTH_BASE}/refresh-token`, { refreshToken: rt })
    .then((res) => res.data);

/**
 * Logout user (clear localStorage)
 */
export const logout = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};
