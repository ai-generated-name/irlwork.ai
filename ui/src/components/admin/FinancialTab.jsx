import { useState, useEffect, useCallback } from 'react'
import { DollarSign, TrendingUp, ArrowDownRight, AlertTriangle, Shield, RefreshCw } from 'lucide-react'
import PeriodSelector from './PeriodSelector'
import { adminFetch } from '../../utils/adminFetch'
import API_URL from '../../config/api'
import Card from '../ui/Card'
import Button from '../ui/Button'

/**
 * Financial Tab — detailed financial metrics
 * GMV, fees, payouts, refunds, disputes, premium breakdown
 */
export default function FinancialTab({ user }) {
  const [period, setPeriod] = useState('30d')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminFetch(`${API_URL}/admin/financials?period=${period}`)
      if (!res.ok) throw new Error('Failed to fetch financial data')
      setData(await res.json())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { fetchData() }, [fetchData])

  const fmt = (cents) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-[#9CA3AF]">Loading financials...</div>
      </div>
    )
  }

  if (error) {
    return (
      <Card padding="none" className="p-12 text-center">
        <p className="text-[#DC2626] font-medium mb-3">{error}</p>
        <Button variant="primary" size="sm" onClick={fetchData}>
          Retry loading
        </Button>
      </Card>
    )
  }

  const tierLabels = { free: 'Free', builder: 'Builder', pro: 'Pro' }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#1A1A1A]">Financial Overview</h2>
          <p className="text-sm text-[#9CA3AF] mt-0.5">Revenue breakdown — GMV, platform fees, payouts, refunds, and subscription tiers.</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <FinCard
          label="Gross merchandise value"
          value={fmt(data?.gmv?.total_cents || 0)}
          count={`${data?.gmv?.count || 0} tasks`}
          icon={<DollarSign size={18} />}
          bg="bg-[#F0FDF4]"
          border="border-green-200"
          iconColor="text-[#16A34A]"
        />
        <FinCard
          label="Platform fees"
          value={fmt(data?.platform_fees?.total_cents || 0)}
          count={`${data?.platform_fees?.count || 0} completed`}
          icon={<TrendingUp size={18} />}
          bg="bg-orange-50"
          border="border-orange-200"
          iconColor="text-orange-600"
        />
        <FinCard
          label="Worker Payouts"
          value={fmt(data?.payouts?.total_cents || 0)}
          count={`${data?.payouts?.count || 0} payouts`}
          icon={<ArrowDownRight size={18} />}
          bg="bg-[#EFF6FF]"
          border="border-blue-200"
          iconColor="text-[#2563EB]"
        />
        <FinCard
          label="Outstanding Escrow"
          value={fmt(data?.outstanding_escrow?.total_cents || 0)}
          count={`${data?.outstanding_escrow?.count || 0} pending`}
          icon={<Shield size={18} />}
          bg="bg-[#FEFCE8]"
          border="border-yellow-200"
          iconColor="text-[#EAB308]"
        />
        <FinCard
          label="Refunds"
          value={fmt(data?.refunds?.total_cents || 0)}
          count={`${data?.refunds?.count || 0} refunded`}
          icon={<RefreshCw size={18} />}
          bg="bg-[#FAFAF8]"
          border="border-[#ECECEC]"
          iconColor="text-[#6B7280]"
        />
        <FinCard
          label="Disputes"
          value={`${data?.disputes?.open || 0} open`}
          count={`${data?.disputes?.resolved || 0} resolved`}
          icon={<AlertTriangle size={18} />}
          bg={data?.disputes?.open > 0 ? 'bg-[#FEF2F2]' : 'bg-[#FAFAF8]'}
          border={data?.disputes?.open > 0 ? 'border-red-200' : 'border-[#ECECEC]'}
          iconColor={data?.disputes?.open > 0 ? 'text-[#DC2626]' : 'text-[#6B7280]'}
        />
      </div>

      {/* Premium / subscription breakdown */}
      <Card padding="lg">
        <h3 className="font-semibold text-[#1A1A1A] mb-4 text-sm">Premium Subscriptions</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-2xl font-bold text-[#1A1A1A]">
              {fmt(data?.premium_revenue?.mrr_cents || 0)}
            </p>
            <p className="text-xs text-[#6B7280]">Monthly recurring revenue</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#1A1A1A]">
              {data?.premium_revenue?.active_subscribers || 0}
            </p>
            <p className="text-xs text-[#6B7280]">Active Subscribers</p>
          </div>
          {Object.entries(data?.premium_revenue?.by_tier || {}).map(([tier, count]) => (
            <div key={tier}>
              <p className="text-2xl font-bold text-[#1A1A1A]">{count}</p>
              <p className="text-xs text-[#6B7280]">{tierLabels[tier] || tier} tier</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Financial summary table */}
      <Card padding="lg">
        <h3 className="font-semibold text-[#1A1A1A] mb-4 text-sm">Summary</h3>
        <table className="w-full text-sm">
          <tbody>
            <SummaryRow label="Gross merchandise value" value={fmt(data?.gmv?.total_cents || 0)} />
            <SummaryRow label="Platform fees collected" value={fmt(data?.platform_fees?.total_cents || 0)} />
            <SummaryRow label="Worker Payouts" value={fmt(data?.payouts?.total_cents || 0)} />
            <SummaryRow label="Refunds Issued" value={fmt(data?.refunds?.total_cents || 0)} negative />
            <SummaryRow label="Outstanding Escrow" value={fmt(data?.outstanding_escrow?.total_cents || 0)} />
            <SummaryRow label="Premium MRR" value={fmt(data?.premium_revenue?.mrr_cents || 0)} />
            <tr className="border-t-2 border-[#ECECEC]">
              <td className="py-3 font-bold text-[#1A1A1A]">Net revenue (fees + MRR)</td>
              <td className="py-3 text-right font-bold text-[#16A34A]">
                {fmt((data?.platform_fees?.total_cents || 0) + (data?.premium_revenue?.mrr_cents || 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function FinCard({ label, value, count, icon, bg, border, iconColor }) {
  return (
    <div className={`rounded-xl border p-5 ${bg} ${border}`}>
      <div className={`mb-2 ${iconColor}`}>{icon}</div>
      <p className="text-2xl font-bold text-[#1A1A1A]">{value}</p>
      <p className="text-xs font-medium text-[#6B7280] mt-0.5">{label}</p>
      <p className="text-xs text-[#9CA3AF] mt-0.5">{count}</p>
    </div>
  )
}

function SummaryRow({ label, value, negative }) {
  return (
    <tr className="border-b border-[#FAFAF8]">
      <td className="py-2.5 text-[#1A1A1A]">{label}</td>
      <td className={`py-2.5 text-right font-medium ${negative ? 'text-red-500' : 'text-[#1A1A1A]'}`}>
        {negative ? `(${value})` : value}
      </td>
    </tr>
  )
}
