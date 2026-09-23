import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email và mật khẩu là bắt buộc");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { role: true, vendor: true },
        });

        if (!user || user.deletedAt) {
          throw new Error("Email hoặc mật khẩu không đúng");
        }

        if (!user.isActive) {
          throw new Error("Tài khoản đã bị khóa");
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error("Tài khoản tạm khóa. Vui lòng thử lại sau");
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) {
          // Increase failed login count
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount: { increment: 1 },
              // Lock after 5 failed attempts for 15 minutes
              ...(user.failedLoginCount >= 4 && {
                lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
              }),
            },
          });
          throw new Error("Email hoặc mật khẩu không đúng");
        }

        // Reset failed login count and update last login
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginCount: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
            inactiveSince: null,
          },
        });

        // Audit log
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "LOGIN",
            module: "admin",
            resource: "users",
            resourceId: user.id,
            description: `User ${user.email} logged in`,
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role.name,
          roleName: user.role.displayName,
          side: user.side,
          vendorId: user.vendorId,
          vendorName: user.vendor?.companyName || null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.roleName = (user as any).roleName;
        token.side = (user as any).side;
        token.vendorId = (user as any).vendorId;
        token.vendorName = (user as any).vendorName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).roleName = token.roleName;
        (session.user as any).side = token.side;
        (session.user as any).vendorId = token.vendorId;
        (session.user as any).vendorName = token.vendorName;
      }
      return session;
    },
  },
});
