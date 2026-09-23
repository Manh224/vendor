import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

// GET /api/categories
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.productCategory.findMany({
    where: { isActive: true },
    orderBy: [{ level: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ success: true, data: categories });
}
