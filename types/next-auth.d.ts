import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    tenantId: string;
    role: Role;
    sessionVersion: number;
  }

  interface Session {
    user: {
      id: string;
      tenantId: string;
      role: Role;
      sessionVersion: number;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid: string;
    tenantId: string;
    role: Role;
    sv: number;
  }
}
