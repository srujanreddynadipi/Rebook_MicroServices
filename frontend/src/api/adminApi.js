import apiClient from "./axiosClient";

export const getAllUsers = () =>
  apiClient.get("/api/admin/users").then((r) => r.data);

export const updateUserRole = (id, role) =>
  apiClient.put(`/api/admin/users/${id}/role`, { role }).then((r) => r.data);

export const deleteUser = (id) =>
  apiClient.delete(`/api/admin/users/${id}`).then((r) => r.data);

export const getAdminStats = () =>
  apiClient.get("/api/admin/stats").then((r) => r.data);
