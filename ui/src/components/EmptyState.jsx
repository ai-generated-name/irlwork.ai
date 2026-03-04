import { Button } from './ui';

export default function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#ECECEC] p-8 md:p-12 shadow-v4-sm text-center">
      <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 bg-teal/10 rounded-2xl flex items-center justify-center">
        <span className="text-3xl md:text-4xl">{icon}</span>
      </div>
      <h3 className="text-lg md:text-xl font-semibold text-[#1A1A1A] mb-2">{title}</h3>
      <p className="text-sm md:text-base text-[#6B7280] mb-6 md:mb-8 max-w-md mx-auto">{description}</p>
      <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4">
        {primaryAction && (
          <Button
            variant="primary"
            size="md"
            onClick={primaryAction.onClick}
            className="shadow-v4-md hover:shadow-v4-lg"
          >
            {primaryAction.label}
          </Button>
        )}
        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            className="px-5 md:px-6 py-2.5 md:py-3 bg-teal/10 text-teal rounded-xl font-medium hover:bg-teal/20 transition-all duration-200 text-sm md:text-base"
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  )
}
