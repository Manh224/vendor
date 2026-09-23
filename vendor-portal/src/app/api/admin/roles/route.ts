import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "supermarket_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const roles = await prisma.role.findMany({
    include: {
      rolePermissions: {
        include: { permission: true },
      },
      _count: { select: { users: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ success: true, data: roles });
}
