import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { X } from 'lucide-react'

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          className={`w-full ${sizeStyles[size] || sizeStyles.md} rounded-2xl bg-white p-6 shadow-xl`}
        >
          <div className="flex items-center justify-between mb-4">
            {title && (
              <DialogTitle className="text-lg font-semibold text-gray-900">
                {title}
              </DialogTitle>
            )}
            <button
              onClick={onClose}
              className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {children}
        </DialogPanel>
      </div>
    </Dialog>
  )
}
