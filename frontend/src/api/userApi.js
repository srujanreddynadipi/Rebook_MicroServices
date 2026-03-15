import axiosInstance from './axiosInstance';

export const getProfile = () =>
  axiosInstance.get('/api/users/profile');

export const getMyProfile = () =>
  axiosInstance.get('/api/users/profile').then((res) => res.data);

export const getUserById = (id) =>
  axiosInstance.get(`/api/users/${id}`);

export const updateProfile = (data) =>
  axiosInstance.put('/api/users/profile', data);

// Admin only — these will return 403 for ROLE_USER tokens
export const getAllUsers = (params) =>
  axiosInstance.get('/api/admin/users', { params }).then((res) => res.data);

export const banUser = (id) =>
  axiosInstance.put(`/api/admin/users/${id}/ban`);

export const unbanUser = (id) =>
  axiosInstance.put(`/api/admin/users/${id}/unban`);

export const deleteUser = (id) =>
  axiosInstance.delete(`/api/admin/users/${id}`);
