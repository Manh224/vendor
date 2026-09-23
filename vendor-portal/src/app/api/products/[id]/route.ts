import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

// GET /api/products/:id
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

  const product = await prisma.product.findUnique({
    where: { id, deletedAt: null },
    include: {
      vendor: { select: { id: true, companyName: true } },
      category: { select: { id: true, name: true, code: true } },
      approver: { select: { fullName: true } },
      creator: { select: { fullName: true } },
      priceChangeRequests: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { reviewer: { select: { fullName: true } } },
      },
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (user.side === "vendor" && product.vendorId !== user.vendorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ success: true, data: product });
}

// PATCH /api/products/:id
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const user = session.user as any;
  const body = await request.json();

  const product = await prisma.product.findUnique({ where: { id, deletedAt: null } });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (user.side === "vendor" && product.vendorId !== user.vendorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Handle status changes (approve/reject) — supermarket only
  if (body.status && user.side === "supermarket") {
    const data: any = { status: body.status };
    if (body.status === "approved" || body.status === "active") {
      data.approvedBy = user.id;
      data.approvedAt = new Date();
    }

    const updated = await prisma.product.update({ where: { id }, data });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "STATUS_CHANGE",
        module: "products",
        resource: "products",
        resourceId: id,
        oldValue: { status: product.status },
        newValue: { status: body.status },
        description: `Changed product "${product.name}" status to ${body.status}`,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  }

  // Regular update — vendor edits product info
  const allowedFields = ["name", "description", "sku", "categoryId", "unit", "packSize", "weight", "shelfLifeDays", "currentPrice", "barcodes", "images", "certifications"];
  const data: any = {};
  for (const f of allowedFields) {
    if (body[f] !== undefined) data[f] = body[f];
  }

  // Vendor editing resets status to draft if it was rejected
  if (user.side === "vendor" && product.status === "draft") {
    // Keep draft
  }

  const updated = await prisma.product.update({ where: { id }, data });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "UPDATE",
      module: "products",
      resource: "products",
      resourceId: id,
      description: `Updated product "${updated.name}"`,
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

// DELETE /api/products/:id (soft delete)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const user = session.user as any;

  const product = await prisma.product.findUnique({ where: { id, deletedAt: null } });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (user.side === "vendor" && product.vendorId !== user.vendorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.product.update({ where: { id }, data: { deletedAt: new Date() } });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "DELETE",
      module: "products",
      resource: "products",
      resourceId: id,
      description: `Deleted product "${product.name}"`,
    },
  });

  return NextResponse.json({ success: true });
}
