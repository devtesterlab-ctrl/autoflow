import type { NextAuthConfig } from "next-auth";

/**
 * Configuración compatible con Edge (la usa el middleware).
 * No importa Prisma ni bcrypt: el provider real vive en auth.ts.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id as string;
        token.tenantId = user.tenantId;
        token.role = user.role;
        token.sv = user.sessionVersion;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid;
      session.user.tenantId = token.tenantId;
      session.user.role = token.role;
      session.user.sessionVersion = token.sv;
      return session;
    },
  },
} satisfies NextAuthConfig;
