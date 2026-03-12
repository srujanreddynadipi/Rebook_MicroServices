import axiosInstance from './axiosInstance';

const NOTIFICATIONS_BASE = '/api/notifications';

/**
 * Get notifications with pagination
 * @param {object} params - { page, size }
 * @returns {Promise<NotificationPage>}
 */
export const getNotifications = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return axiosInstance
    .get(`${NOTIFICATIONS_BASE}${queryString ? '?' + queryString : ''}`)
    .then((res) => res.data);
};

/**
 * Get unread notification count
 * @returns {Promise<{unreadCount: number}>}
 */
export const getUnreadCount = () =>
  axiosInstance.get(`${NOTIFICATIONS_BASE}/unread-count`).then((res) => res.data);

/**
 * Mark a notification as read
 * @param {string} id - Notification ID
 * @returns {Promise<NotificationResponse>}
 */
export const markAsRead = (id) =>
  axiosInstance.put(`${NOTIFICATIONS_BASE}/${id}/read`, {}).then((res) => res.data);

/**
 * Mark all notifications as read
 * @returns {Promise<void>}
 */
export const markAllAsRead = () =>
  axiosInstance.put(`${NOTIFICATIONS_BASE}/read-all`, {}).then((res) => res.data);
