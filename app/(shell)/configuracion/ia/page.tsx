import { prisma } from "@/lib/db";
import { relativeTime } from "@/lib/ui-maps";

export default async function AiUsagePage() {
  const logs = await prisma.aiUsageLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  const totalCost = logs.reduce((sum, l) => sum + (l.costEstimateUsd ?? 0), 0);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Uso de IA</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-muted">Llamadas (últimas 100)</p>
          <p className="text-2xl font-semibold">{logs.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-muted">Costo estimado</p>
          <p className="text-2xl font-semibold">${totalCost.toFixed(4)}</p>
        </div>
      </div>

      <div className="divide-y divide-border rounded-xl border border-border bg-surface">
        {logs.map((log) => (
          <div key={log.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <div>
              <p>
                {log.operation} · {log.model}
              </p>
              <p className="text-xs text-muted">{relativeTime(log.createdAt)}</p>
            </div>
            <div className="text-right text-xs text-muted">
              {log.tokensInput ?? "?"}→{log.tokensOutput ?? "?"} tok
              {log.costEstimateUsd != null && <p>${log.costEstimateUsd.toFixed(5)}</p>}
            </div>
          </div>
        ))}
        {logs.length === 0 && <p className="p-6 text-center text-sm text-muted">Todavía no se usó la IA.</p>}
      </div>
    </div>
  );
}
