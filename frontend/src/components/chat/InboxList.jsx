import { getInitials, formatTimeAgo } from '../../utils/helpers'

export default function InboxList({ conversations = [], activeId, onSelect }) {
  if (!conversations.length) {
    return (
      <div className="p-6 text-center text-gray-400 text-sm">
        No conversations yet
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {conversations.map((conv) => {
        const isActive = conv.id === activeId
        const hasUnread = conv.unreadCount > 0

        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv)}
            className={`
              w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
              hover:bg-gray-50
              ${isActive ? 'bg-teal-50 border-l-4 border-teal-500' : 'border-l-4 border-transparent'}
            `}
          >
            {/* Avatar */}
            <div className="w-10 h-10 flex-shrink-0 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-semibold text-sm">
              {getInitials(conv.participantName)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className={`text-sm truncate ${hasUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                  {conv.participantName}
                </span>
                {conv.lastMessageTime && (
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                    {formatTimeAgo(conv.lastMessageTime)}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {conv.lastMessage || 'No messages yet'}
              </p>
            </div>

            {/* Unread dot */}
            {hasUnread && (
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
            )}
          </button>
        )
      })}
    </div>
  )
}
