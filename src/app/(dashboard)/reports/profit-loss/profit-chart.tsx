"use client"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts"
import { formatIDR, formatIDRCompact } from "@/lib/money"
import type { ProfitLossDaily, ProfitLossTopProduct } from "@/modules/reports/queries"

export function ProfitChart({ data }: { data: ProfitLossDaily[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
        Belum ada penjualan pada rentang ini.
      </div>
    )
  }

  return (
    <div className="h-[260px] w-full" data-testid="profit-chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16a34a" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={(v: string) => v.slice(5)}
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis
            tickFormatter={(v) => formatIDRCompact(Number(v))}
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
            width={70}
          />
          <Tooltip
            formatter={(value, name) => [formatIDR(Number(value)), String(name)]}
            labelFormatter={(label) => `Tanggal ${String(label)}`}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid hsl(var(--border))",
              fontSize: 12
            }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            name="Omzet"
            stroke="hsl(var(--primary))"
            fill="url(#revenueFill)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="profit"
            name="Laba kotor"
            stroke="#16a34a"
            fill="url(#profitFill)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function TopProductChart({ data }: { data: ProfitLossTopProduct[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
        Belum ada produk terjual.
      </div>
    )
  }

  const chartData = data.slice(0, 7).map((row) => ({
    name: row.name.length > 22 ? `${row.name.slice(0, 21)}…` : row.name,
    profit: Math.round(row.profit)
  }))

  return (
    <div className="h-[260px] w-full" data-testid="top-product-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
          barCategoryGap={6}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v) => formatIDRCompact(Number(v))}
            tick={{ fontSize: 10 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            tick={{ fontSize: 10 }}
            stroke="hsl(var(--muted-foreground))"
            interval={0}
          />
          <Tooltip
            formatter={(value) => [formatIDR(Number(value)), "Laba"]}
            contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
          />
          <Bar dataKey="profit" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {chartData.map((row) => (
              <Cell key={row.name} fill={row.profit >= 0 ? "#16a34a" : "#dc2626"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
