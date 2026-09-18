import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";

async function login(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/");

  try {
    await signIn("credentials", { email, password, redirectTo: callbackUrl });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/login?error=1&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
    throw error;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Segundo Cerebro</h1>
        <p className="mb-8 text-sm text-muted">Iniciá sesión para continuar</p>

        <form action={login} className="space-y-4">
          <input type="hidden" name="callbackUrl" value={params.callbackUrl ?? "/"} />
          <div>
            <label className="mb-1 block text-sm text-muted" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-base focus:border-accent focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-base focus:border-accent focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1"
            />
          </div>

          {params.error && <p className="text-sm text-priority-critical">Credenciales inválidas.</p>}

          <button
            type="submit"
            className="w-full rounded-lg bg-accent px-3 py-2.5 font-medium text-accent-foreground transition hover:opacity-90"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
