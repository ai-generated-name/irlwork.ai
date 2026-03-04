import { useState, useEffect, useCallback } from 'react'
import { ArrowDown, Clock } from 'lucide-react'
import PeriodSelector from './PeriodSelector'
import { adminFetch } from '../../utils/adminFetch'
import API_URL from '../../config/api'
import Card from '../ui/Card'
import Button from '../ui/Button'

/**
 * Funnel Tab — conversion funnel visualization
 * Shows task lifecycle drop-off and conversion rates
 */
export default function FunnelTab({ user }) {
  const [period, setPeriod] = useState('30d')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminFetch(`${API_URL}/admin/funnel?period=${period}`)
      if (!res.ok) throw new Error('Failed to fetch funnel data')
      setData(await res.json())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-[#9CA3AF]">Loading funnel...</div>
      </div>
    )
  }

  if (error) {
    return (
      <Card padding="none" className="p-12 text-center">
        <p className="text-[#DC2626] font-medium mb-3">{error}</p>
        <Button variant="primary" size="sm" onClick={fetchData}>
          Retry
        </Button>
      </Card>
    )
  }

  const funnel = data?.funnel || {}
  const rates = data?.conversion_rates || {}
  const times = data?.avg_times || {}

  const maxValue = Math.max(funnel.tasks_created || 1, 1)

  const stages = [
    { label: 'Tasks Created', value: funnel.tasks_created, key: 'tasks_created' },
    { label: 'With Applications', value: funnel.tasks_with_applications, rate: rates.created_to_applied, key: 'tasks_with_applications' },
    { label: 'Assigned', value: funnel.tasks_assigned, rate: rates.applied_to_assigned, key: 'tasks_assigned' },
    { label: 'Started', value: funnel.tasks_started, rate: rates.assigned_to_started, key: 'tasks_started' },
    { label: 'Completed', value: funnel.tasks_completed, rate: rates.started_to_completed, key: 'tasks_completed' },
    { label: 'Approved', value: funnel.tasks_approved, key: 'tasks_approved' },
    { label: 'Paid', value: funnel.tasks_paid, rate: rates.completed_to_paid, key: 'tasks_paid' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#1A1A1A]">Conversion Funnel</h2>
          <p className="text-sm text-[#9CA3AF] mt-0.5">Task lifecycle drop-off from creation to payout, with stage-by-stage conversion rates.</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Visual funnel */}
      <Card padding="lg">
        <div className="space-y-1">
          {stages.map((stage, i) => {
            const widthPct = maxValue > 0 ? Math.max((stage.value / maxValue) * 100, 8) : 8

            return (
              <div key={stage.key}>
                {i > 0 && stage.rate && (
                  <div className="flex items-center gap-2 py-1.5 pl-4">
                    <ArrowDown size={14} className="text-[#9CA3AF]" />
                    <span className="text-xs font-medium text-[#9CA3AF]">{stage.rate} conversion</span>
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <div className="w-36 text-right">
                    <span className="text-sm font-medium text-[#1A1A1A]">{stage.label}</span>
                  </div>
                  <div className="flex-1 relative">
                    <div
                      className="h-10 rounded-lg flex items-center px-4 transition-all"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: getFunnelColor(i, stages.length),
                        minWidth: 60,
                      }}
                    >
                      <span className="text-sm font-bold text-white">{stage.value}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Overall rate */}
        <div className="mt-6 pt-4 border-t border-[#ECECEC] flex items-center gap-2">
          <span className="text-sm font-medium text-[#6B7280]">Overall conversion:</span>
          <span className="text-lg font-bold text-orange-600">{rates.overall || '0%'}</span>
          <span className="text-xs text-[#9CA3AF] ml-2">(created to paid)</span>
        </div>
      </Card>

      {/* Average times */}
      <Card padding="lg">
        <h3 className="font-semibold text-[#1A1A1A] mb-4 text-sm flex items-center gap-2">
          <Clock size={16} /> Average lifecycle times
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <TimeCard
            label="Created to Assigned"
            hours={times.created_to_first_application_hours}
          />
          <TimeCard
            label="Assigned to Started"
            hours={times.assigned_to_started_hours}
          />
          <TimeCard
            label="Started to Completed"
            hours={times.started_to_completed_hours}
          />
        </div>
      </Card>

      {/* Conversion rates table */}
      <Card padding="lg">
        <h3 className="font-semibold text-[#1A1A1A] mb-4 text-sm">Conversion Rates</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#ECECEC]">
                <th className="text-left py-2 text-[#6B7280] font-medium">Transition</th>
                <th className="text-right py-2 text-[#6B7280] font-medium">Rate</th>
              </tr>
            </thead>
            <tbody>
              <RateRow label="Created \u2192 Applied" rate={rates.created_to_applied} />
              <RateRow label="Applied \u2192 Assigned" rate={rates.applied_to_assigned} />
              <RateRow label="Assigned \u2192 Started" rate={rates.assigned_to_started} />
              <RateRow label="Started \u2192 Completed" rate={rates.started_to_completed} />
              <RateRow label="Completed \u2192 Paid" rate={rates.completed_to_paid} />
              <tr className="border-t-2 border-[#ECECEC]">
                <td className="py-2 font-bold text-[#1A1A1A]">Overall</td>
                <td className="py-2 text-right font-bold text-orange-600">{rates.overall}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function getFunnelColor(index, total) {
  // Gradient from orange to amber
  const colors = ['#F97316', '#FB923C', '#FBBF24', '#FCD34D', '#FDE68A', '#d4d4d8', '#e5e7eb']
  return colors[Math.min(index, colors.length - 1)]
}

function TimeCard({ label, hours }) {
  const display = hours > 0
    ? hours >= 24
      ? `${(hours / 24).toFixed(1)} days`
      : `${hours} hours`
    : 'N/A'

  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-[#1A1A1A]">{display}</p>
      <p className="text-xs text-[#6B7280] mt-1">{label}</p>
    </div>
  )
}

function RateRow({ label, rate }) {
  const pctNum = parseFloat(rate) || 0

  return (
    <tr className="border-b border-[#FAFAF8]">
      <td className="py-2.5 text-[#1A1A1A]">{label}</td>
      <td className="py-2.5 text-right">
        <span className={`font-medium ${pctNum >= 50 ? 'text-[#16A34A]' : pctNum >= 20 ? 'text-[#EAB308]' : 'text-red-500'}`}>
          {rate || '0%'}
        </span>
      </td>
    </tr>
  )
}
