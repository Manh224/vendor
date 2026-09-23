import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

// PATCH /api/vendors/:id/documents/:docId — Review document
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;

  // Only supermarket side can review documents
  if (user.side !== "supermarket") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, docId } = await params;
  const body = await request.json();
  const { status, reviewNotes } = body;

  if (!status || !["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const document = await prisma.vendorDocument.findFirst({
    where: { id: docId, vendorId: id },
    include: { documentType: true },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const updated = await prisma.vendorDocument.update({
    where: { id: docId },
    data: {
      status,
      reviewedBy: user.id,
      reviewedAt: new Date(),
      reviewNotes: reviewNotes || null,
    },
    include: { documentType: true },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: status === "approved" ? "APPROVE" : "REJECT",
      module: "vendors",
      resource: "vendor_documents",
      resourceId: docId,
      description: `${status === "approved" ? "Approved" : "Rejected"} document "${document.documentType.name}"`,
    },
  });

  return NextResponse.json({ success: true, data: updated });
}
