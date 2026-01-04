import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { TrendingUp, TrendingDown, Calendar, Target } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { GlassCard } from '@/components/ui'
import { useData } from '@/context'
import { formatCurrency } from '@/lib/utils'

// Category colors for charts
const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': '#f59e0b',
  'Transportation': '#3b82f6',
  'Shopping': '#8b5cf6',
  'Bills & Utilities': '#f97316',
  'Groceries': '#22c55e',
  'Health': '#ec4899',
  'Transfer': '#06b6d4',
  'Other': '#64748b',
}

export function AnalyticsPage() {
  const { transactions, summary } = useData()

  // Calculate category breakdown
  const categoryData = transactions
    .filter(t => t.direction === 'out')
    .reduce((acc, t) => {
      const existing = acc.find(c => c.name === t.category)
      if (existing) {
        existing.value += t.amount
      } else {
        acc.push({
          name: t.category,
          value: t.amount,
          color: CATEGORY_COLORS[t.category] || CATEGORY_COLORS['Other'],
        })
      }
      return acc
    }, [] as { name: string; value: number; color: string }[])
    .sort((a, b) => b.value - a.value)

  // Mock weekly data
  const weeklyData = [
    { day: 'Mon', income: 0, expense: 150 },
    { day: 'Tue', income: 5000, expense: 320 },
    { day: 'Wed', income: 0, expense: 89 },
    { day: 'Thu', income: 0, expense: 450 },
    { day: 'Fri', income: 0, expense: 200 },
    { day: 'Sat', income: 0, expense: 180 },
    { day: 'Sun', income: 0, expense: 0 },
  ]

  return (
    <PageContainer bottomPadding={false}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">Analytics</h1>
          <p className="text-slate-400">Your spending patterns and insights</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <GlassCard size="md" className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs text-slate-400">Total Income</span>
                </div>
                <div className="text-xl font-bold text-emerald-400">
                  {formatCurrency(summary.totalIncome, 'SAR')}
                </div>
              </div>
            </GlassCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GlassCard size="md" className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/10 rounded-full blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-rose-400" />
                  <span className="text-xs text-slate-400">Total Expenses</span>
                </div>
                <div className="text-xl font-bold text-rose-400">
                  {formatCurrency(summary.totalExpenses, 'SAR')}
                </div>
              </div>
            </GlassCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <GlassCard size="md">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-xs text-slate-400">This Month</span>
              </div>
              <div className="text-xl font-bold text-white">
                {summary.transactionCount}
              </div>
              <span className="text-xs text-slate-500">transactions</span>
            </GlassCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <GlassCard size="md">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-slate-400">Avg/Day</span>
              </div>
              <div className="text-xl font-bold text-white">
                {formatCurrency(summary.totalExpenses / 30, 'SAR')}
              </div>
              <span className="text-xs text-slate-500">spending</span>
            </GlassCard>
          </motion.div>
        </div>

        {/* Category Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-6"
        >
          <GlassCard size="lg">
            <h3 className="text-lg font-semibold text-white mb-4">Spending by Category</h3>
            
            {categoryData.length > 0 ? (
              <div className="flex items-center gap-6">
                {/* Pie Chart */}
                <div className="w-32 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="flex-1 space-y-2">
                  {categoryData.slice(0, 4).map((category) => (
                    <div key={category.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-sm text-slate-300">{category.name}</span>
                      </div>
                      <span className="text-sm font-medium text-white">
                        {formatCurrency(category.value, 'SAR')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">No expense data yet</p>
            )}
          </GlassCard>
        </motion.div>

        {/* Weekly Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <GlassCard size="lg">
            <h3 className="text-lg font-semibold text-white mb-4">Weekly Activity</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <XAxis 
                    dataKey="day" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <YAxis 
                    hide 
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                    }}
                    labelStyle={{ color: '#fff' }}
                    itemStyle={{ color: '#94a3b8' }}
                  />
                  <Bar 
                    dataKey="expense" 
                    fill="#f43f5e" 
                    radius={[4, 4, 0, 0]}
                    name="Expense"
                  />
                  <Bar 
                    dataKey="income" 
                    fill="#10b981" 
                    radius={[4, 4, 0, 0]}
                    name="Income"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>
    </PageContainer>
  )
}

