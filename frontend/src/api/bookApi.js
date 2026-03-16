import axiosInstance from './axiosInstance';

const BOOKS_BASE = '/api/books';

/**
 * Get books with search and filter params
 * @param {object} params - { keyword, category, condition, type, city, maxDistance, page, size }
 * @returns {Promise<BookPage>}
 */
export const getBooks = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return axiosInstance
    .get(`${BOOKS_BASE}/search${queryString ? '?' + queryString : ''}`)
    .then((res) => res.data);
};

/**
 * Get book by ID
 * @param {string} id - Book ID
 * @returns {Promise<BookResponse>}
 */
export const getBookById = (id) =>
  axiosInstance.get(`${BOOKS_BASE}/${id}`).then((res) => res.data);

/**
 * Get current user's books with pagination
 * @param {object} params - { page, size }
 * @returns {Promise<BookPage>}
 */
export const getMyBooks = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return axiosInstance
    .get(`${BOOKS_BASE}/my${queryString ? '?' + queryString : ''}`)
    .then((res) => res.data);
};

/**
 * Create a new book with images
 * @param {FormData} formData - { book: JSON string, images: File[] }
 * @returns {Promise<BookResponse>}
 */
export const createBook = (formData) =>
  axiosInstance
    .post(BOOKS_BASE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data);

/**
 * Update book
 * @param {string} id - Book ID
 * @param {FormData} formData - { book: JSON string, images: File[] }
 * @returns {Promise<BookResponse>}
 */
export const updateBook = (id, formData) =>
  axiosInstance
    .put(`${BOOKS_BASE}/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data);

/**
 * Delete book
 * @param {string} id - Book ID
 * @returns {Promise<void>}
 */
export const deleteBook = (id) =>
  axiosInstance.delete(`${BOOKS_BASE}/${id}`).then((res) => res.data);

/**
 * Get popular books
 * @returns {Promise<BookResponse[]>}
 */
export const getPopularBooks = () =>
  axiosInstance.get(`${BOOKS_BASE}/popular`).then((res) => {
    const payload = res.data;

    if (Array.isArray(payload)) {
      return payload;
    }

    // Some deployments return a paginated wrapper instead of a bare array.
    if (Array.isArray(payload?.content)) {
      return payload.content;
    }

    if (Array.isArray(payload?.data)) {
      return payload.data;
    }

    return [];
  });

/**
 * Get book recommendations based on similarity
 * @param {string} bookId - Book ID
 * @returns {Promise<BookResponse[]>}
 */
export const getRecommendations = (bookId) =>
  axiosInstance.get(`/api/recommendations/${bookId}`).then((res) => res.data);

/**
 * Convert uploaded study material file into an audiobook
 * @param {object} payload - { file: File, voice?: string }
 * @returns {Promise<{blob: Blob, fileName: string}>}
 */
export const convertDocumentToAudiobook = ({ file, voice }) => {
  const formData = new FormData();
  formData.append('file', file);

  const query = voice ? `?voice=${encodeURIComponent(voice)}` : '';

  return axiosInstance
    .post(`${BOOKS_BASE}/study-material/audiobook${query}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      responseType: 'blob',
    })
    .then((res) => {
      let fileName = 'audiobook.mp3';
      const contentDisposition = res?.headers?.['content-disposition'];

      if (contentDisposition) {
        const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
        const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
        const rawName = utfMatch?.[1] || plainMatch?.[1];
        if (rawName) {
          try {
            fileName = decodeURIComponent(rawName.trim());
          } catch {
            fileName = rawName.trim();
          }
        }
      }

      return { blob: res.data, fileName };
    });
};
