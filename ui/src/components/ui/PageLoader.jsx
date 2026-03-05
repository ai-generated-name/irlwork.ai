export function PageLoader({ message = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[rgba(220,200,180,0.35)] border-t-[#E8703D] rounded-full animate-spin" />
        <p className="text-sm text-[rgba(26,20,16,0.50)] font-['JetBrains_Mono']">{message}</p>
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
        <p className="text-sm text-[rgba(26,20,16,0.50)] font-['JetBrains_Mono']">{message}</p>
        {onRetry && (
          <button onClick={onRetry} className="text-sm text-[#E8703D] hover:underline">
            Try again
          </button>
        )}
      </div>
    </div>
  )
}
