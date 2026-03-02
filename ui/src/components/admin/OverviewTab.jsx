import { useState, useEffect, useCallback } from 'react'
import { DollarSign, Users, TrendingUp, CreditCard } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Legend } from 'recharts'
import PeriodSelector from './PeriodSelector'
import { adminFetch } from '../../utils/adminFetch'
import API_URL from '../../config/api'
import Card from '../ui/Card'
import Button from '../ui/Button'

/**
 * Overview Tab — top-level BI dashboard
 * Shows GMV, fees, escrow, subscribers, plus charts for tasks/signups per day
 */
export default function OverviewTab({ user }) {
  const [period, setPeriod] = useState('30d')
  const [financials, setFinancials] = useState(null)
  const [growth, setGrowth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [finRes, growthRes] = await Promise.all([
        adminFetch(`${API_URL}/admin/financials?period=${period}`),
        adminFetch(`${API_URL}/admin/growth?period=${period}`),
      ])

      if (!finRes.ok || !growthRes.ok) throw new Error('Failed to fetch data')

      const [finData, growthData] = await Promise.all([finRes.json(), growthRes.json()])
      setFinancials(finData)
      setGrowth(growthData)
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
        <div className="text-[#9CA3AF]">Loading overview...</div>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#1A1A1A]">Platform Overview</h2>
          <p className="text-sm text-[#9CA3AF] mt-0.5">Top-level metrics — GMV, escrow balances, signups, and daily activity trends.</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Top cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Gross merchandise value"
          value={fmt(financials?.gmv?.total_cents || 0)}
          subtitle={`${financials?.gmv?.count || 0} tasks`}
          icon={<DollarSign size={18} />}
          color="green"
        />
        <MetricCard
          label="Platform fees earned"
          value={fmt(financials?.platform_fees?.total_cents || 0)}
          subtitle={`${financials?.platform_fees?.count || 0} completed`}
          icon={<TrendingUp size={18} />}
          color="orange"
        />
        <MetricCard
          label="Outstanding Escrow"
          value={fmt(financials?.outstanding_escrow?.total_cents || 0)}
          subtitle={`${financials?.outstanding_escrow?.count || 0} pending`}
          icon={<CreditCard size={18} />}
          color="blue"
        />
        <MetricCard
          label="Active Subscribers"
          value={financials?.premium_revenue?.active_subscribers || 0}
          subtitle={`MRR: ${fmt(financials?.premium_revenue?.mrr_cents || 0)}`}
          icon={<Users size={18} />}
          color="purple"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks created per day */}
        <Card padding="md">
          <h3 className="font-semibold text-[#1A1A1A] mb-4 text-sm">Tasks created per day</h3>
          {(growth?.tasks?.created_by_day || []).length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={growth.tasks.created_by_day}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 13 }} />
                <Bar dataKey="count" fill="#F97316" radius={[4, 4, 0, 0]} name="Tasks" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-[#9CA3AF] text-sm">No data</div>
          )}
        </Card>

        {/* Signups per day */}
        <Card padding="md">
          <h3 className="font-semibold text-[#1A1A1A] mb-4 text-sm">Signups per day</h3>
          {(growth?.users?.signups_by_day || []).length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={growth.users.signups_by_day}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="humans" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Humans" stackId="stack" />
                <Bar dataKey="agents" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Agents" stackId="stack" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-[#9CA3AF] text-sm">No data</div>
          )}
        </Card>
      </div>

      {/* Summary stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox label="Total Users" value={growth?.users?.total || 0} />
        <StatBox label="Humans" value={growth?.users?.humans || 0} />
        <StatBox label="Agents" value={growth?.users?.agents || 0} />
        <StatBox label="New this period" value={growth?.users?.new_this_period || 0} />
        <StatBox label="Total Tasks" value={growth?.tasks?.total || 0} />
        <StatBox label="Created this period" value={growth?.tasks?.created_this_period || 0} />
        <StatBox label="Completed this period" value={growth?.tasks?.completed_this_period || 0} />
        <StatBox label="Open Disputes" value={financials?.disputes?.open || 0} alert={financials?.disputes?.open > 0} />
      </div>

      {/* Active users */}
      <Card padding="md">
        <h3 className="font-semibold text-[#1A1A1A] mb-3 text-sm">Active Users</h3>
        <div className="flex gap-8">
          <div>
            <p className="text-2xl font-bold text-[#1A1A1A]">{growth?.active_users?.daily || 0}</p>
            <p className="text-xs text-[#6B7280]">Daily</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#1A1A1A]">{growth?.active_users?.weekly || 0}</p>
            <p className="text-xs text-[#6B7280]">Weekly</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#1A1A1A]">{growth?.active_users?.monthly || 0}</p>
            <p className="text-xs text-[#6B7280]">Monthly</p>
          </div>
        </div>
      </Card>
    </div>
  )
}

function MetricCard({ label, value, subtitle, icon, color }) {
  const colors = {
    green: 'bg-[#F0FDF4] border-green-200 text-[#16A34A]',
    orange: 'bg-orange-50 border-orange-200 text-orange-600',
    blue: 'bg-[#EFF6FF] border-blue-200 text-[#2563EB]',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
  }

  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="opacity-70">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-[#1A1A1A]">{value}</p>
      <p className="text-xs font-medium mt-0.5">{label}</p>
      <p className="text-xs text-[#9CA3AF] mt-0.5">{subtitle}</p>
    </div>
  )
}

function StatBox({ label, value, alert }) {
  return (
    // eslint-disable-next-line irlwork/no-inline-card-pattern -- conditional alert styling with dynamic bg/border colors
    <div className={`bg-white rounded-xl border p-4 ${alert ? 'border-red-200 bg-[#FEF2F2]' : 'border-[#ECECEC]'}`}>
      <p className={`text-xl font-bold ${alert ? 'text-[#DC2626]' : 'text-[#1A1A1A]'}`}>{value}</p>
      <p className="text-xs text-[#6B7280]">{label}</p>
    </div>
  )
}
