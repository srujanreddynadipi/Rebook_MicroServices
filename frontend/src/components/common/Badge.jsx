const colorStyles = {
  green:  'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red:    'bg-red-100 text-red-800',
  blue:   'bg-blue-100 text-blue-800',
  gray:   'bg-gray-100 text-gray-700',
  purple: 'bg-purple-100 text-purple-800',
  teal:   'bg-teal-100 text-teal-800',
  orange: 'bg-orange-100 text-orange-800',
}

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
}

export default function Badge({ color = 'gray', children, size = 'md' }) {
  return (
    <span
      className={`
        inline-flex items-center rounded-full font-semibold
        ${colorStyles[color] || colorStyles.gray}
        ${sizeStyles[size] || sizeStyles.md}
      `}
    >
      {children}
    </span>
  )
}
