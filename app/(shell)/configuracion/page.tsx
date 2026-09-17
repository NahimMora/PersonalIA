import Link from "next/link";
import { signOut } from "@/lib/auth";

const links = [
  { href: "/configuracion/repositorios", label: "Repositorios GitHub", desc: "Conectar y sincronizar documentación" },
  { href: "/configuracion/tokens", label: "Tokens (Shortcuts)", desc: "Accesos personales para iPhone / NFC" },
  { href: "/configuracion/ia", label: "Uso de IA", desc: "Consumo y costo estimado" },
  { href: "/configuracion/proyectos", label: "Proyectos", desc: "Crear y administrar proyectos y módulos" },
];

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Ajustes</h1>
      <div className="divide-y divide-border rounded-xl border border-border bg-surface">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="block px-4 py-3 hover:bg-surface-hover">
            <p className="text-sm font-medium">{l.label}</p>
            <p className="text-xs text-muted">{l.desc}</p>
          </Link>
        ))}
      </div>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button className="w-full rounded-lg border border-border px-3 py-2.5 text-sm text-priority-critical hover:bg-surface-hover">
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
