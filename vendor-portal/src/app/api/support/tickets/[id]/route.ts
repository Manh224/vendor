import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      creator: { select: { fullName: true } },
      assignee: { select: { fullName: true } },
      vendor: { select: { id: true, companyName: true } },
      messages: {
        include: { sender: { select: { fullName: true, side: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true, data: ticket });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const data: any = {};
  if (body.status) {
    data.status = body.status;
    if (body.status === "resolved" || body.status === "closed") data.resolvedAt = new Date();
  }
  if (body.assignedTo) {
    data.assignedTo = body.assignedTo;
    data.assignedAt = new Date();
  }
  if (body.priority) data.priority = body.priority;

  const updated = await prisma.ticket.update({ where: { id }, data });

  return NextResponse.json({ success: true, data: updated });
}
