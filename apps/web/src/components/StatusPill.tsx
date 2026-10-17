type StatusPillProps = {
  label: string
  tone?: 'neutral' | 'success' | 'warning'
}

export function StatusPill({ label, tone = 'neutral' }: StatusPillProps) {
  return <span className={`status-pill status-pill-${tone}`}><span aria-hidden="true" />{label}</span>
}
