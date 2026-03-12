const sizes = { sm: 'w-5 h-5', md: 'w-10 h-10', lg: 'w-16 h-16' }

export default function Spinner({ size = 'md', fullPage = false }) {
  const spinner = (
    <div
      className={`${sizes[size]} border-4 border-gray-200 border-t-teal-500 rounded-full animate-spin`}
    />
  )

  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        {spinner}
      </div>
    )
  }

  return spinner
}
