import "@/lib/load-env";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

// Single-user-first auth: credentials are checked against the `users` table so
// adding more accounts later (Phase "multi-user") needs no migration, just
// more rows. Session strategy is JWT to avoid a sessions table for a personal app.
// Hostinger's Node.js hosting sits behind its own proxy/CDN layer, so the
// Host header Auth.js sees isn't automatically "trusted" by default and every
// request fails with `UntrustedHost` otherwise. Set via the AUTH_TRUST_HOST=true
// env var (see .env.example / docs/DEPLOYMENT.md) rather than `trustHost: true`
// here in code — explicitly setting it in this config object triggered an
// unrelated "Invalid URL" crash on every request in production (this exact
// next-auth beta version); env-var-driven auto-detection works correctly.
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name ?? undefined, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: string }).role ?? "ADMIN";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
});
