export default function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-12 shadow-v4-sm text-center">
      <div className="w-20 h-20 mx-auto mb-6 bg-teal/10 rounded-2xl flex items-center justify-center">
        <span className="text-4xl">{icon}</span>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 mb-8 max-w-md mx-auto">{description}</p>
      <div className="flex justify-center gap-4">
        {primaryAction && (
          <button
            onClick={primaryAction.onClick}
            className="px-6 py-3 bg-coral text-white rounded-xl font-medium hover:bg-coral-dark shadow-v4-md hover:shadow-v4-lg transition-all duration-200"
          >
            {primaryAction.label}
          </button>
        )}
        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            className="px-6 py-3 bg-teal/10 text-teal rounded-xl font-medium hover:bg-teal/20 transition-all duration-200"
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  )
}
