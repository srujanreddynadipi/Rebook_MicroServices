import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, FileUp, SendHorizontal, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  deleteRagDocument,
  listRagDocuments,
  sendRagMessage,
  uploadRagDocument,
} from '../../api/ragApi';

const ALLOWED_RAG_EXT = ['pdf', 'docx', 'txt', 'md'];

function getErrorMessage(err, fallback) {
  return err?.response?.data?.message || err?.message || fallback;
}

export default function RagPage() {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([]);

  const documentsQuery = useQuery({
    queryKey: ['rag-documents'],
    queryFn: listRagDocuments,
  });

  const uploadMutation = useMutation({
    mutationFn: uploadRagDocument,
    onSuccess: (data) => {
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['rag-documents'] });
      toast.success(data?.message || 'Document uploaded and indexed');
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to upload document'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRagDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rag-documents'] });
      toast.success('Document deleted');
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to delete document'));
    },
  });

  const chatMutation = useMutation({
    mutationFn: sendRagMessage,
    onSuccess: (data, variables) => {
      const nextSession = data?.sessionId || variables?.sessionId || '';
      if (nextSession && nextSession !== sessionId) {
        setSessionId(nextSession);
      }

      setMessages((prev) => [
        ...prev,
        { role: 'user', text: variables.message },
        {
          role: 'assistant',
          text: data?.response || 'No response received',
          meta: {
            chunksUsed: data?.chunksUsed,
            sourceDocuments: data?.sourceDocuments || [],
          },
        },
      ]);
      setPrompt('');
    },
    onError: (err, variables) => {
      setMessages((prev) => [
        ...prev,
        { role: 'user', text: variables.message },
        { role: 'assistant', text: `Error: ${getErrorMessage(err, 'RAG chat failed')}` },
      ]);
    },
  });

  const canUpload = !!selectedFile && !uploadMutation.isPending;
  const canSend = prompt.trim().length > 0 && !chatMutation.isPending;

  const selectedExt = useMemo(() => {
    if (!selectedFile?.name) return '';
    const dot = selectedFile.name.lastIndexOf('.');
    return dot > -1 ? selectedFile.name.slice(dot + 1).toLowerCase() : '';
  }, [selectedFile]);

  const onSelectFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const dot = file.name.lastIndexOf('.');
    const ext = dot > -1 ? file.name.slice(dot + 1).toLowerCase() : '';

    if (!ALLOWED_RAG_EXT.includes(ext)) {
      toast.error('Use one of: pdf, docx, txt, md');
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const onUpload = () => {
    if (!selectedFile) {
      toast.error('Select a file first');
      return;
    }
    uploadMutation.mutate(selectedFile);
  };

  const onSend = () => {
    const text = prompt.trim();
    if (!text) return;

    chatMutation.mutate({
      message: text,
      sessionId: sessionId || undefined,
      maxResults: 4,
      similarityThreshold: 0.2,
    });
  };

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: 'calc(100vh - 64px)', padding: '30px 20px' }}>
      <div className="mx-auto" style={{ maxWidth: 1100 }}>
        <h1 style={{ margin: 0, fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: '1.9rem', color: 'var(--text-primary)' }}>
          RAG Workspace
        </h1>
        <p style={{ marginTop: 6, color: 'var(--text-muted)', fontFamily: "'DM Sans', sans-serif" }}>
          Upload context documents, then ask questions grounded in your own content.
        </p>

        <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginTop: 18 }}>
          <section style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-card)', padding: 16 }}>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Documents</h2>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <label style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                height: 40,
                padding: '0 14px',
                borderRadius: 10,
                border: '1px dashed rgba(148,163,184,0.6)',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                fontWeight: 600,
              }}>
                <FileUp size={16} /> Pick File
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.md,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  style={{ display: 'none' }}
                  onChange={onSelectFile}
                />
              </label>

              <button
                onClick={onUpload}
                disabled={!canUpload}
                style={{
                  height: 40,
                  padding: '0 14px',
                  borderRadius: 10,
                  border: 'none',
                  background: canUpload ? 'var(--primary)' : 'rgba(99,102,241,0.45)',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: canUpload ? 'pointer' : 'not-allowed',
                }}
              >
                {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
              </button>
            </div>

            <p style={{ marginTop: 10, marginBottom: 10, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {selectedFile ? `Selected: ${selectedFile.name}${selectedExt ? ` (${selectedExt})` : ''}` : 'No file selected'}
            </p>

            <div style={{ maxHeight: 320, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
              {documentsQuery.isLoading ? (
                <p style={{ margin: 0, padding: 12, color: 'var(--text-muted)' }}>Loading documents...</p>
              ) : (documentsQuery.data || []).length === 0 ? (
                <p style={{ margin: 0, padding: 12, color: 'var(--text-muted)' }}>No documents uploaded yet.</p>
              ) : (
                (documentsQuery.data || []).map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: 12,
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <div>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{doc.fileName || `Document ${doc.id}`}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        Chunks: {doc.chunkCount ?? 0}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(doc.id)}
                      disabled={deleteMutation.isPending}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--danger)',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-card)', padding: 16 }}>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: '1.05rem', color: 'var(--text-primary)' }}>RAG Chat</h2>

            <div style={{
              minHeight: 280,
              maxHeight: 380,
              overflow: 'auto',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 10,
              background: 'var(--bg-page)',
            }}>
              {messages.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>Ask your first question after uploading documents.</p>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      marginBottom: 10,
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: msg.role === 'user' ? 'rgba(99,102,241,0.12)' : '#fff',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                      {msg.role === 'user' ? 'You' : 'RAG Assistant'}
                    </div>
                    <div style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                    {msg.meta?.sourceDocuments?.length > 0 && (
                      <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Sources: {msg.meta.sourceDocuments.join(', ')}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask about your uploaded content..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                style={{
                  flex: 1,
                  height: 42,
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  padding: '0 12px',
                  outline: 'none',
                }}
              />
              <button
                onClick={onSend}
                disabled={!canSend}
                style={{
                  height: 42,
                  padding: '0 14px',
                  border: 'none',
                  borderRadius: 10,
                  background: canSend ? 'var(--accent-orange)' : 'rgba(251,146,60,0.5)',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: canSend ? 'pointer' : 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {chatMutation.isPending ? <Bot size={16} /> : <SendHorizontal size={16} />}
                {chatMutation.isPending ? 'Thinking...' : 'Send'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
