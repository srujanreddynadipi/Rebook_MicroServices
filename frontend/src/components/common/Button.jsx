import Spinner from './Spinner'

const variantStyles = {
  primary:   'bg-teal-500 hover:bg-teal-600 text-white',
  secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
  outline:   'border-2 border-teal-500 text-teal-600 hover:bg-teal-50',
  danger:    'bg-red-500 hover:bg-red-600 text-white',
  ghost:     'text-teal-600 hover:bg-teal-50',
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-6 py-3 text-base rounded-xl',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  children,
  onClick,
  type = 'button',
  className = '',
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`
        inline-flex items-center justify-center gap-2
        font-medium transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-1
        disabled:opacity-60 disabled:cursor-not-allowed
        ${variantStyles[variant] || variantStyles.primary}
        ${sizeStyles[size] || sizeStyles.md}
        ${className}
      `}
    >
      {isLoading && <Spinner size="sm" />}
      {children}
    </button>
  )
}
