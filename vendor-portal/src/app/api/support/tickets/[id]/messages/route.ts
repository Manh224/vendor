import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = session.user as any;
  const body = await request.json();
  const { message } = body;

  if (!message) return NextResponse.json({ error: "Nội dung là bắt buộc" }, { status: 400 });

  const ticketMessage = await prisma.ticketMessage.create({
    data: {
      ticketId: id,
      senderId: user.id,
      message,
    },
    include: { sender: { select: { fullName: true, side: true } } },
  });

  // Update ticket status to in_progress if it was new
  await prisma.ticket.updateMany({
    where: { id, status: "new" },
    data: { status: "in_progress" },
  });

  return NextResponse.json({ success: true, data: ticketMessage }, { status: 201 });
}
