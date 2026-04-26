import React from 'react'

type Props = {
  title: string
  value: string | number
  hint?: string
  icon?: string
  color?: 'blue' | 'orange' | 'green' | 'yellow'
  pulse?: boolean
}

export function StatCard({ title, value, hint, icon, color = 'blue', pulse }: Props) {
  const colorMap = {
    blue: 'from-blue-500/20 to-blue-600/20 text-blue-400 border-blue-500/20',
    orange: 'from-orange-500/20 to-orange-600/20 text-orange-400 border-orange-500/20',
    green: 'from-green-500/20 to-green-600/20 text-green-400 border-green-500/20',
    yellow: 'from-yellow-500/20 to-yellow-600/20 text-yellow-400 border-yellow-500/20',
  }

  return (
    <div className={`bg-surface border border-border rounded-[12px] p-5 card-hover ${pulse ? 'animate-pulse-card' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] font-[500] text-text-muted">{title}</p>
          <p className="mt-2 text-stat text-text">{value}</p>
          {hint && <p className="mt-1 text-[11px] text-text-secondary">{hint}</p>}
        </div>
        
        {icon && (
          <div className={`w-10 h-10 rounded-sm flex items-center justify-center bg-gradient-to-br border ${colorMap[color]}`}>
            <span className="material-icons-round text-[20px]">{icon}</span>
          </div>
        )}
      </div>
    </div>
  )
}
