import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import App from './App.jsx';
import './index.css';

function handleGlobalError(error) {
  if (error?.response?.status === 401) return; // handled by axios interceptor
  const msg = error?.response?.data?.message || error?.message || 'Something went wrong';
  toast.error(msg);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      onError: handleGlobalError,
    },
    mutations: {
      onError: handleGlobalError,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <WebSocketProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                fontFamily: "'DM Sans', sans-serif",
                borderRadius: '12px',
                background: '#fff',
                color: '#1A1D23',
                boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
              },
              success: { iconTheme: { primary: '#00C9A7', secondary: '#fff' } },
              error: { iconTheme: { primary: '#FF4D4F', secondary: '#fff' } },
              duration: 3000,
            }}
          />
          </WebSocketProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
);
