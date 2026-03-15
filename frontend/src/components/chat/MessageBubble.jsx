import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { formatChatTime } from '../../utils/helpers';

/**
 * MessageBubble
 * Props:
 *   message  — { id, senderId, content, createdAt, read }
 *   isOwn    — bool: true if the logged-in user sent this
 */
export default function MessageBubble({ message, isOwn }) {
  const timeLabel = formatChatTime(message.createdAt);

  return (
    <div
      className={`flex mb-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
      style={{ padding: '0 12px' }}
    >
      <div style={{ maxWidth: '72%' }}>
        {/* Bubble */}
        <div
          className="font-['DM_Sans'] break-words"
          style={{
            display: 'inline-block',
            padding: '10px 14px',
            borderRadius: 18,
            ...(isOwn
              ? {
                  background: 'var(--primary)',
                  color: 'white',
                  borderBottomRightRadius: 4,
                }
              : {
                  background: '#F0F2F5',
                  color: 'var(--text-primary)',
                  borderBottomLeftRadius: 4,
                }),
            fontSize: '0.9375rem',
            lineHeight: 1.5,
            wordBreak: 'break-word',
          }}
        >
          {message.content}
        </div>

        {/* Timestamp + read indicator */}
        <div
          className={`flex items-center gap-1 mt-0.5 font-['DM_Sans'] text-[11px] ${isOwn ? 'justify-end' : 'justify-start'}`}
          style={{ color: 'var(--text-muted)', paddingInline: 4 }}
        >
          <span>{timeLabel}</span>
          {/* Show double-tick for own messages */}
          {isOwn && (
            <span
              style={{
                fontSize: 13,
                color: message.read ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: 700,
                letterSpacing: '-2px',
              }}
              title={message.read ? 'Read' : 'Sent'}
            >
              ✓✓
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
