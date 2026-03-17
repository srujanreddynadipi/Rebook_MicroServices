import axiosInstance from './axiosInstance';

const RAG_BASE = '/api/rag';

export const uploadRagDocument = (file) => {
  const formData = new FormData();
  formData.append('file', file);

  return axiosInstance
    .post(`${RAG_BASE}/documents/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000,
    })
    .then((res) => res.data);
};

export const listRagDocuments = () =>
  axiosInstance.get(`${RAG_BASE}/documents`).then((res) => res.data || []);

export const deleteRagDocument = (id) =>
  axiosInstance.delete(`${RAG_BASE}/documents/${id}`).then((res) => res.data);

export const sendRagMessage = ({ message, sessionId, maxResults = 4, similarityThreshold = 0.2 }) =>
  axiosInstance
    .post(`${RAG_BASE}/chat`, {
      message,
      sessionId,
      maxResults,
      similarityThreshold,
    }, {
      timeout: 300000,
    })
    .then((res) => res.data);
