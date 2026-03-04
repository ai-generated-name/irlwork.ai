export function PageLoader({ message = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-[#E8853D] rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-['DM_Sans']">{message}</p>
      </div>
    </div>
  )
}

export function ButtonLoader() {
  return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
}

export function PageError({ message = 'Something went wrong', onRetry }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-gray-600 font-['DM_Sans']">{message}</p>
        {onRetry && (
          <button onClick={onRetry} className="text-sm text-[#E8853D] hover:underline">
            Try again
          </button>
        )}
      </div>
    </div>
  )
}
