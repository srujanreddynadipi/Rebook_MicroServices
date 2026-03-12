export default function Input({
  label,
  error,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  register,
  className = '',
  ...props
}) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      <div className="relative">
        {LeftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <LeftIcon size={18} />
          </div>
        )}

        <input
          {...(register || {})}
          {...props}
          className={`
            w-full rounded-lg border bg-white px-4 py-2.5 text-sm
            placeholder:text-gray-400 transition-colors
            focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400
            ${LeftIcon ? 'pl-10' : ''}
            ${RightIcon ? 'pr-10' : ''}
            ${error ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : 'border-gray-300'}
            ${className}
          `}
        />

        {RightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
            <RightIcon size={18} />
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}
