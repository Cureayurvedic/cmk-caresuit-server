import { prisma } from "../../config/database.js";
import { NotFoundError, AppError } from "../../utils/errors.js";

export class BillingService {
  static async listInvoices(queryParams) {
    const { search, status, type, uhid, invoiceNo, limit = 50, page = 1 } = queryParams;
    const filter = {};

    if (uhid) filter.uhid = uhid;
    if (invoiceNo) filter.invoiceNo = { contains: invoiceNo, mode: "insensitive" };
    if (type && type !== "Both") filter.type = type;
    if (status && status !== "all") {
      filter.status = status;
    }

    if (search) {
      filter.OR = [
        { patientName: { contains: search, mode: "insensitive" } },
        { uhid: { contains: search, mode: "insensitive" } },
        { invoiceNo: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [invoices, total] = await prisma.$transaction([
      prisma.invoice.findMany({
        where: filter,
        include: { receipts: true },
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where: filter }),
    ]);

    return {
      invoices,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  static async settleInvoice(data) {
    const { invoiceId, payments } = data; // payments is array of { mode, amount, bankName, beneficiaryName, refNo, type }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundError(`Invoice with ID ${invoiceId} not found.`);
    }

    if (invoice.isCancelled) {
      throw new AppError("Cannot process payments on a cancelled invoice.", 400);
    }

    let updatedPaidPatient = invoice.paidPatient;
    let updatedPaidPayer = invoice.paidPayer;
    let updatedAdjusted = invoice.adjusted;
    let updatedRefund = invoice.refund;
    let updatedCreditNote = invoice.creditNote;
    let updatedTdsAmt = invoice.tdsAmt;

    const receiptRecords = [];

    for (const payment of payments) {
      const amt = Number(payment.amount || 0);
      const pType = payment.type || "Settlement";

      if (pType === "Settlement") {
        updatedAdjusted += amt;
        updatedPaidPatient += amt; // default to patient for simplicity
      } else if (pType === "Refund") {
        updatedRefund += amt;
      } else if (pType === "CreditNote") {
        updatedCreditNote += amt;
      } else if (pType === "TDS") {
        updatedTdsAmt += amt;
      }

      receiptRecords.push({
        mode: payment.mode,
        amount: amt,
        bankName: payment.bankName || null,
        beneficiaryName: payment.beneficiaryName || null,
        refNo: payment.refNo || null,
        type: pType,
        notes: payment.notes || null,
      });
    }

    const newBalance = invoice.netAmt - updatedAdjusted - updatedCreditNote - updatedTdsAmt + updatedRefund;

    let newStatus = "Outstanding";
    if (newBalance === 0) {
      newStatus = "Settled";
    } else if (newBalance < 0) {
      newStatus = "Refundable";
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidPatient: updatedPaidPatient,
          paidPayer: updatedPaidPayer,
          adjusted: updatedAdjusted,
          refund: updatedRefund,
          creditNote: updatedCreditNote,
          tdsAmt: updatedTdsAmt,
          balance: newBalance,
          status: newStatus,
        },
      });

      for (const rec of receiptRecords) {
        await tx.receipt.create({
          data: {
            invoiceId,
            ...rec,
          },
        });
      }

      return updatedInvoice;
    });

    return result;
  }

  static async cancelInvoice(id) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      throw new NotFoundError(`Invoice with ID ${id} not found.`);
    }

    return await prisma.invoice.update({
      where: { id },
      data: {
        isCancelled: true,
        status: "Cancelled",
        balance: 0,
      },
    });
  }

  static async seedDemoInvoices() {
    const count = await prisma.invoice.count();
    if (count > 0) {
      return { message: "Database already has invoices." };
    }

    const demoInvoices = [
      {
        company: "CASH / CASH",
        uhid: "3",
        patientName: "PatientName",
        encNo: "2",
        type: "OP",
        invoiceNo: "OPCA20/1",
        date: new Date("2026-08-10"),
        netAmt: 500,
        paidPatient: 500,
        adjusted: 500,
        creditNote: -500,
        balance: 500,
        status: "Outstanding",
      },
      {
        company: "CASH / CASH",
        uhid: "13",
        patientName: "Mother Patient",
        encNo: "19/3",
        type: "IP",
        invoiceNo: "QHIC20/1",
        date: new Date("2026-08-09"),
        netAmt: 4050,
        paidPatient: 4050,
        adjusted: 4050,
        balance: 0,
        status: "Settled",
      },
      {
        company: "Star Health / Sponsor",
        uhid: "222",
        patientName: "Mr. Somesh Kumar",
        encNo: "21/3",
        type: "IP",
        invoiceNo: "IPCA26/3",
        date: new Date("2026-08-12"),
        netAmt: 15400,
        paidPatient: 2400,
        paidPayer: 10000,
        adjusted: 12400,
        balance: 3000,
        status: "Outstanding",
      },
    ];

    let inserted = 0;
    for (const inv of demoInvoices) {
      await prisma.invoice.create({ data: inv });
      inserted++;
    }

    return { insertedCount: inserted };
  }
}
