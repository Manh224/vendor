import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

// GET /api/vendors/:id/contacts — List contacts
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const user = session.user as any;

  if (user.side === "vendor" && user.vendorId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contacts = await prisma.vendorContact.findMany({
    where: { vendorId: id },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ success: true, data: contacts });
}

// POST /api/vendors/:id/contacts — Create contact
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const user = session.user as any;

  if (user.side === "vendor" && user.vendorId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { fullName, position, email, phone, isPrimary } = body;

  if (!fullName) {
    return NextResponse.json({ error: "Họ tên là bắt buộc" }, { status: 400 });
  }

  // If setting as primary, unset other primaries
  if (isPrimary) {
    await prisma.vendorContact.updateMany({
      where: { vendorId: id, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  const contact = await prisma.vendorContact.create({
    data: {
      vendorId: id,
      fullName,
      position,
      email,
      phone,
      isPrimary: isPrimary || false,
    },
  });

  return NextResponse.json({ success: true, data: contact }, { status: 201 });
}
