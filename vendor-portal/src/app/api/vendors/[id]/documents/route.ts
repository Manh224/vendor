import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

// GET /api/vendors/:id/documents — List documents
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

  const [documents, documentTypes] = await Promise.all([
    prisma.vendorDocument.findMany({
      where: { vendorId: id },
      include: {
        documentType: true,
        reviewer: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.vendorDocumentType.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({ success: true, data: { documents, documentTypes } });
}

// POST /api/vendors/:id/documents — Upload document
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
  const { documentTypeId, documentNumber, fileUrl, fileName, issuedDate, expiryDate } = body;

  if (!documentTypeId || !fileUrl) {
    return NextResponse.json(
      { error: "Loại giấy tờ và file là bắt buộc" },
      { status: 400 }
    );
  }

  const document = await prisma.vendorDocument.create({
    data: {
      vendorId: id,
      documentTypeId,
      documentNumber,
      fileUrl,
      fileName,
      issuedDate: issuedDate ? new Date(issuedDate) : null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      status: "pending",
    },
    include: { documentType: true },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "CREATE",
      module: "vendors",
      resource: "vendor_documents",
      resourceId: document.id,
      description: `Uploaded document "${document.documentType.name}" for vendor`,
    },
  });

  return NextResponse.json({ success: true, data: document }, { status: 201 });
}
