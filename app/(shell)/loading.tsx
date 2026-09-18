export default function ShellLoading() {
  return (
    <div className="animate-pulse space-y-4" role="status" aria-label="Cargando">
      <div className="h-7 w-40 rounded-md bg-surface-sunken" />
      <div className="space-y-2 rounded-xl border border-border bg-surface p-4">
        <div className="h-4 w-3/4 rounded bg-surface-sunken" />
        <div className="h-4 w-1/2 rounded bg-surface-sunken" />
        <div className="h-4 w-2/3 rounded bg-surface-sunken" />
      </div>
      <div className="space-y-2 rounded-xl border border-border bg-surface p-4">
        <div className="h-4 w-2/3 rounded bg-surface-sunken" />
        <div className="h-4 w-1/3 rounded bg-surface-sunken" />
      </div>
    </div>
  );
}
