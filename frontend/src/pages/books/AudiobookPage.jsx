import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Download, FileAudio, FileText, UploadCloud, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { convertDocumentToAudiobook } from '../../api/bookApi';

const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'txt', 'rtf'];

function humanFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** idx);
  return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export default function AudiobookPage() {
  const [file, setFile] = useState(null);
  const [voice, setVoice] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [audioFileName, setAudioFileName] = useState('audiobook.wav');

  const fileExt = useMemo(() => {
    if (!file?.name) return '';
    const dot = file.name.lastIndexOf('.');
    return dot > -1 ? file.name.substring(dot + 1).toLowerCase() : '';
  }, [file]);

  const conversionMutation = useMutation({
    mutationFn: ({ sourceFile, selectedVoice }) =>
      convertDocumentToAudiobook({ file: sourceFile, voice: selectedVoice }),
    onSuccess: ({ blob, fileName }) => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      const nextUrl = URL.createObjectURL(blob);
      setAudioUrl(nextUrl);
      setAudioFileName(fileName || 'audiobook.wav');
      toast.success('Audiobook generated successfully');
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to generate audiobook';
      toast.error(msg);
    },
  });

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const validateFile = (selected) => {
    if (!selected) return false;
    const dot = selected.name.lastIndexOf('.');
    const ext = dot > -1 ? selected.name.substring(dot + 1).toLowerCase() : '';

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error('Unsupported file. Use pdf, doc, docx, txt, or rtf.');
      return false;
    }

    return true;
  };

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!validateFile(selected)) {
      event.target.value = '';
      return;
    }
    setFile(selected);
  };

  const handleConvert = () => {
    if (!file) {
      toast.error('Please upload a study document first');
      return;
    }

    conversionMutation.mutate({ sourceFile: file, selectedVoice: voice });
  };

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: 'calc(100vh - 64px)', padding: '30px 20px' }}>
      <div className="mx-auto" style={{ maxWidth: 980 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: '2rem', color: 'var(--text-primary)' }}>
            Document to Audiobook
          </h1>
          <p style={{ marginTop: 6, color: 'var(--text-muted)', fontFamily: "'DM Sans', sans-serif" }}>
            Upload a study file and convert it into downloadable audiobook audio.
          </p>
        </div>

        <div style={{
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)',
          boxShadow: 'var(--shadow-card)',
          padding: 20,
        }}>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: 'var(--text-primary)' }}>
                Study Material File
              </label>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                height: 46,
                borderRadius: 10,
                border: '1px dashed rgba(148,163,184,0.6)',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                fontWeight: 600,
              }}>
                <UploadCloud size={18} />
                Choose Document
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/rtf"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </label>
              <p style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Supported: pdf, doc, docx, txt, rtf
              </p>
            </div>

            <div>
              <label htmlFor="voice-select" style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: 'var(--text-primary)' }}>
                Voice
              </label>
              <select
                id="voice-select"
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                style={{
                  width: '100%',
                  height: 46,
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  padding: '0 12px',
                  background: '#fff',
                  color: 'var(--text-primary)',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <option value="">Default (fastest)</option>
                <option value="en_US-lessac-medium">English (Lessac Medium)</option>
                <option value="alloy">Alloy</option>
                <option value="echo">Echo</option>
                <option value="fable">Fable</option>
                <option value="onyx">Onyx</option>
                <option value="nova">Nova</option>
                <option value="shimmer">Shimmer</option>
              </select>
              <p style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                For Piper mode, choose Default or a Piper voice name for fastest conversion.
              </p>
            </div>
          </div>

          <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: 'var(--bg-page)', border: '1px solid var(--border)' }}>
            {file ? (
              <div className="flex items-center justify-between gap-3" style={{ flexWrap: 'wrap' }}>
                <div className="flex items-center gap-2">
                  <FileText size={16} color="var(--text-secondary)" />
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{file.name}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>({fileExt || 'file'}, {humanFileSize(file.size)})</span>
                </div>
                <button
                  onClick={() => setFile(null)}
                  style={{ border: 'none', background: 'transparent', color: 'var(--danger)', cursor: 'pointer', fontWeight: 600 }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No file selected</span>
            )}
          </div>

          <button
            onClick={handleConvert}
            disabled={conversionMutation.isPending || !file}
            style={{
              marginTop: 18,
              height: 44,
              padding: '0 20px',
              border: 'none',
              borderRadius: 'var(--radius-btn)',
              background: conversionMutation.isPending || !file ? 'rgba(99,102,241,0.45)' : 'var(--primary)',
              color: '#fff',
              fontWeight: 700,
              fontFamily: "'DM Sans', sans-serif",
              cursor: conversionMutation.isPending || !file ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Wand2 size={16} />
            {conversionMutation.isPending ? 'Converting...' : 'Convert to Audiobook'}
          </button>
        </div>

        {audioUrl && (
          <div style={{
            marginTop: 20,
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            boxShadow: 'var(--shadow-card)',
            padding: 20,
          }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
              <FileAudio size={18} color="var(--text-primary)" />
              <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Generated Audiobook</h2>
            </div>

            <audio controls style={{ width: '100%', marginBottom: 14 }} src={audioUrl} />

            <a
              href={audioUrl}
              download={audioFileName}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                height: 42,
                padding: '0 16px',
                borderRadius: 10,
                textDecoration: 'none',
                background: 'var(--accent-orange)',
                color: '#fff',
                fontWeight: 700,
              }}
            >
              <Download size={16} /> Download {audioFileName}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
