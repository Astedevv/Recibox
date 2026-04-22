type Props = {
  title: string
  value: string
  hint?: string
}

export function StatCard({ title, value, hint }: Props) {
  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}
