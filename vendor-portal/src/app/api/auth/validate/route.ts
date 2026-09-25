import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import bcrypt from "bcryptjs";

// POST /api/auth/validate — Pre-validate credentials before NextAuth signIn
export async function POST(request: Request) {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { vendor: { select: { status: true } } },
  });

  if (!user || user.deletedAt) {
    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  if (!user.isActive) {
    // Vendor registered but not yet activated by admin
    if (user.vendor?.status === "pending_registration") {
      return NextResponse.json({ error: "ACCOUNT_PENDING" }, { status: 403 });
    }
    return NextResponse.json({ error: "ACCOUNT_SUSPENDED" }, { status: 403 });
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return NextResponse.json({ error: "ACCOUNT_LOCKED" }, { status: 403 });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
