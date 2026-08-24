/** Manifest-style section header: tracked small caps + a short cargo-yellow rule -- the one
 * signature treatment repeated across every panel, instead of a plain <h2>. */
export function PanelHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-manifest">{title}</h2>
      <div className="mt-1.5 h-px w-8 bg-cargo-yellow" />
      {subtitle && <div className="mt-2 text-xs text-steel">{subtitle}</div>}
    </div>
  )
}
