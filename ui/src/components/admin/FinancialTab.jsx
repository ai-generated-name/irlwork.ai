import { useState, useEffect, useCallback } from 'react'
import { DollarSign, TrendingUp, ArrowDownRight, AlertTriangle, Shield, RefreshCw } from 'lucide-react'
import PeriodSelector from './PeriodSelector'
import { useAuth } from '../../context/AuthContext'
import API_URL from '../../config/api'

/**
 * Financial Tab — detailed financial metrics
 * GMV, fees, payouts, refunds, disputes, premium breakdown
 */
export default function FinancialTab({ user }) {
  const { authenticatedFetch } = useAuth()
  const [period, setPeriod] = useState('30d')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authenticatedFetch(`${API_URL}/admin/financials?period=${period}`)
      if (!res.ok) throw new Error('Failed to fetch financial data')
      setData(await res.json())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [period, authenticatedFetch])

  useEffect(() => { fetchData() }, [fetchData])

  const fmt = (cents) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-gray-400">Loading financials...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-red-600 font-medium mb-3">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600">
          Retry loading
        </button>
      </div>
    )
  }

  const tierLabels = { free: 'Free', builder: 'Builder', pro: 'Pro' }

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Financial Overview</h2>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <FinCard
          label="Gross merchandise value"
          value={fmt(data?.gmv?.total_cents || 0)}
          count={`${data?.gmv?.count || 0} tasks`}
          icon={<DollarSign size={18} />}
          bg="bg-green-50"
          border="border-green-200"
          iconColor="text-green-600"
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
          bg="bg-blue-50"
          border="border-blue-200"
          iconColor="text-blue-600"
        />
        <FinCard
          label="Outstanding Escrow"
          value={fmt(data?.outstanding_escrow?.total_cents || 0)}
          count={`${data?.outstanding_escrow?.count || 0} pending`}
          icon={<Shield size={18} />}
          bg="bg-yellow-50"
          border="border-yellow-200"
          iconColor="text-yellow-600"
        />
        <FinCard
          label="Refunds"
          value={fmt(data?.refunds?.total_cents || 0)}
          count={`${data?.refunds?.count || 0} refunded`}
          icon={<RefreshCw size={18} />}
          bg="bg-gray-50"
          border="border-gray-200"
          iconColor="text-gray-600"
        />
        <FinCard
          label="Disputes"
          value={`${data?.disputes?.open || 0} open`}
          count={`${data?.disputes?.resolved || 0} resolved`}
          icon={<AlertTriangle size={18} />}
          bg={data?.disputes?.open > 0 ? 'bg-red-50' : 'bg-gray-50'}
          border={data?.disputes?.open > 0 ? 'border-red-200' : 'border-gray-200'}
          iconColor={data?.disputes?.open > 0 ? 'text-red-600' : 'text-gray-600'}
        />
      </div>

      {/* Premium / subscription breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4 text-sm">Premium Subscriptions</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {fmt(data?.premium_revenue?.mrr_cents || 0)}
            </p>
            <p className="text-xs text-gray-500">Monthly Recurring Revenue</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {data?.premium_revenue?.active_subscribers || 0}
            </p>
            <p className="text-xs text-gray-500">Active Subscribers</p>
          </div>
          {Object.entries(data?.premium_revenue?.by_tier || {}).map(([tier, count]) => (
            <div key={tier}>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500">{tierLabels[tier] || tier} tier</p>
            </div>
          ))}
        </div>
      </div>

      {/* Financial summary table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4 text-sm">Summary</h3>
        <table className="w-full text-sm">
          <tbody>
            <SummaryRow label="Gross merchandise value" value={fmt(data?.gmv?.total_cents || 0)} />
            <SummaryRow label="Platform fees collected" value={fmt(data?.platform_fees?.total_cents || 0)} />
            <SummaryRow label="Worker Payouts" value={fmt(data?.payouts?.total_cents || 0)} />
            <SummaryRow label="Refunds Issued" value={fmt(data?.refunds?.total_cents || 0)} negative />
            <SummaryRow label="Outstanding Escrow" value={fmt(data?.outstanding_escrow?.total_cents || 0)} />
            <SummaryRow label="Premium MRR" value={fmt(data?.premium_revenue?.mrr_cents || 0)} />
            <tr className="border-t-2 border-gray-200">
              <td className="py-3 font-bold text-gray-900">Net Revenue (Fees + MRR)</td>
              <td className="py-3 text-right font-bold text-green-600">
                {fmt((data?.platform_fees?.total_cents || 0) + (data?.premium_revenue?.mrr_cents || 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FinCard({ label, value, count, icon, bg, border, iconColor }) {
  return (
    <div className={`rounded-xl border p-5 ${bg} ${border}`}>
      <div className={`mb-2 ${iconColor}`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs font-medium text-gray-600 mt-0.5">{label}</p>
      <p className="text-xs text-gray-400 mt-0.5">{count}</p>
    </div>
  )
}

function SummaryRow({ label, value, negative }) {
  return (
    <tr className="border-b border-gray-50">
      <td className="py-2.5 text-gray-700">{label}</td>
      <td className={`py-2.5 text-right font-medium ${negative ? 'text-red-500' : 'text-gray-900'}`}>
        {negative ? `(${value})` : value}
      </td>
    </tr>
  )
}
