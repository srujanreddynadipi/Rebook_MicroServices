import { BookOpen } from 'lucide-react'
import Badge from '../common/Badge'
import Button from '../common/Button'
import { getStatusColor, getRequestTypeBadgeColor, formatDate } from '../../utils/helpers'

export default function RequestCard({ request, viewType = 'sent', actions = {} }) {
  const statusColor = getStatusColor(request.status)
  const typeColor = getRequestTypeBadgeColor(request.requestType)

  const book = request.book || {}
  const thumbnail = book.imageKeys?.[0]
  const title = book.title || 'Unknown Book'
  const author = book.author || ''

  return (
    <div className="flex gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Thumbnail */}
      <div className="w-16 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
        {thumbnail ? (
          <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <BookOpen size={24} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-900 truncate">{title}</h4>
        {author && <p className="text-sm text-gray-500 truncate">{author}</p>}

        <div className="flex flex-wrap items-center gap-2 mt-2">
          <Badge color={typeColor} size="sm">{request.requestType}</Badge>
          <Badge color={statusColor} size="sm">{request.status}</Badge>
        </div>

        <p className="text-xs text-gray-400 mt-1">{formatDate(request.createdAt)}</p>

        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          {viewType === 'received' && request.status === 'PENDING' && (
            <>
              {actions.onApprove && (
                <Button size="sm" variant="primary" onClick={() => actions.onApprove(request)}>
                  Approve
                </Button>
              )}
              {actions.onReject && (
                <Button size="sm" variant="danger" onClick={() => actions.onReject(request)}>
                  Reject
                </Button>
              )}
            </>
          )}
          {viewType === 'sent' && request.status === 'PENDING' && actions.onCancel && (
            <Button size="sm" variant="outline" onClick={() => actions.onCancel(request)}>
              Cancel
            </Button>
          )}
          {request.status === 'APPROVED' && actions.onReturn && (
            <Button size="sm" variant="secondary" onClick={() => actions.onReturn(request)}>
              Return
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
