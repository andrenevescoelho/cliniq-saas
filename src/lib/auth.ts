// lib/auth.ts
import NextAuth, { type DefaultSession, type NextAuthConfig } from "next-auth";
import type {} from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { UserRole } from "@prisma/client";

// Extend NextAuth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      clinicId: string;
      role: UserRole;
    } & DefaultSession["user"];
  }
  interface User {
    clinicId?: string;
    role?: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    clinicId?: string;
    role?: UserRole;
    userId?: string;
  }
}

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        clinicSlug: { label: "Clinic", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email);
        const password = String(credentials.password);
        const clinicSlug = credentials.clinicSlug
          ? String(credentials.clinicSlug)
          : undefined;

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            clinics: {
              where: {
                isActive: true,
                clinic: clinicSlug ? { slug: clinicSlug } : undefined,
              },
              include: { clinic: true },
              take: 1,
            },
          },
        });

        if (!user || !user.passwordHash) return null;
        if (!user.isActive) return null;

        const valid = await bcrypt.compare(
          password,
          user.passwordHash
        );
        if (!valid) return null;

        const clinicUser = user.clinics[0];
        if (!clinicUser) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
          clinicId: clinicUser.clinicId,
          role: clinicUser.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.clinicId = user.clinicId;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.userId!;
        session.user.clinicId = token.clinicId!;
        session.user.role = token.role!;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
