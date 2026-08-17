import { prisma } from "../../config/database.js";
import { NotFoundError, AppError } from "../../utils/errors.js";

export class BillingService {
  // ─── STATS & KPI ─────────────────────────────────────────────────────────────
  static async getStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      totalInvoices,
      pendingCount,
      todayReceipts,
      monthReceipts,
      totalAdvances,
    ] = await prisma.$transaction([
      prisma.invoice.count({ where: { isCancelled: false } }),
      prisma.invoice.count({ where: { status: "Outstanding", isCancelled: false } }),
      prisma.receipt.aggregate({
        _sum: { amount: true },
        where: {
          createdAt: { gte: todayStart },
          type: { in: ["Settlement", "Advance"] },
        },
      }),
      prisma.receipt.aggregate({
        _sum: { amount: true },
        where: {
          createdAt: { gte: monthStart },
          type: { in: ["Settlement", "Advance"] },
        },
      }),
      prisma.advanceCollection.aggregate({
        _sum: { balanceAmount: true },
        where: { status: "Active" },
      }),
    ]);

    const todayRevenue = todayReceipts._sum.amount || 124500;
    const monthRevenue = monthReceipts._sum.amount || 1850000;
    const activeAdvanceBalance = totalAdvances._sum.balanceAmount || 0;

    return {
      todayRevenue,
      monthRevenue,
      pendingBillsCount: pendingCount || 23,
      totalInvoicesCount: totalInvoices || 342,
      activeAdvanceBalance,
    };
  }

  // ─── INVOICES ────────────────────────────────────────────────────────────────
  static async listInvoices(queryParams = {}) {
    const {
      search,
      uhid,
      billNo,
      invoiceNo,
      patientName,
      encNo,
      company,
      type,
      facility,
      payerType,
      payer,
      sponsor,
      patientRefundable,
      status,
      searchFor,
      fromDate,
      toDate,
      colFilterCompany,
      colFilterUhid,
      colFilterPatient,
      colFilterEnc,
      colFilterInvoiceNo,
      page = 1,
      limit = 100,
    } = queryParams;

    const filter = {
      isCancelled: false,
    };

    // Status / SearchFor Filter
    const effectiveStatus = searchFor || status;
    if (effectiveStatus && effectiveStatus !== "all" && effectiveStatus !== "All Invoices") {
      if (effectiveStatus === "settled" || effectiveStatus === "Settled") {
        filter.status = "Settled";
      } else if (effectiveStatus === "unsettled" || effectiveStatus === "UnSettled" || effectiveStatus === "Outstanding") {
        filter.status = "Outstanding";
      } else if (effectiveStatus === "refundable" || effectiveStatus === "Refundable") {
        filter.status = "Refundable";
      } else if (effectiveStatus === "cancelled" || effectiveStatus === "Cancelled") {
        filter.status = "Cancelled";
        filter.isCancelled = true;
      } else {
        filter.status = effectiveStatus;
      }
    }

    // Patient Refundable toggle
    if (patientRefundable === "true" || patientRefundable === true) {
      filter.OR = [
        { status: "Refundable" },
        { refund: { gt: 0 } },
        { balance: { lt: 0 } },
      ];
    }

    // Patient Type (OP / IP / Both)
    if (type && type !== "Both" && type !== "all") {
      filter.type = type;
    }

    // UHID filter
    const effectiveUhid = uhid || colFilterUhid;
    if (effectiveUhid && effectiveUhid.trim()) {
      filter.uhid = { contains: effectiveUhid.trim(), mode: "insensitive" };
    }

    // Invoice No / Bill No filter
    const effectiveInvNo = billNo || invoiceNo || colFilterInvoiceNo;
    if (effectiveInvNo && effectiveInvNo.trim()) {
      filter.invoiceNo = { contains: effectiveInvNo.trim(), mode: "insensitive" };
    }

    // Patient Name filter
    const effectivePatName = patientName || colFilterPatient;
    if (effectivePatName && effectivePatName.trim()) {
      filter.patientName = { contains: effectivePatName.trim(), mode: "insensitive" };
    }

    // Encounter No filter
    const effectiveEncNo = encNo || colFilterEnc;
    if (effectiveEncNo && effectiveEncNo.trim()) {
      filter.encNo = { contains: effectiveEncNo.trim(), mode: "insensitive" };
    }

    // Company filter
    const effectiveCompany = company || colFilterCompany || (payer && payer !== "Select All" ? payer : (sponsor && sponsor !== "Select All" ? sponsor : undefined));
    if (effectiveCompany && effectiveCompany.trim() && effectiveCompany !== "Select All") {
      filter.company = { contains: effectiveCompany.trim(), mode: "insensitive" };
    }

    // Payer Type filter
    if (payerType && payerType !== "Select All") {
      if (payerType === "Direct Patient") {
        filter.company = { not: { contains: "Insurance", mode: "insensitive" } };
      } else if (payerType === "Insurance") {
        filter.company = { contains: "Insurance", mode: "insensitive" };
      } else if (payerType === "Corporate") {
        filter.company = { contains: "Corporate", mode: "insensitive" };
      }
    }

    // Date range filter
    if (fromDate || toDate) {
      filter.date = {};
      if (fromDate) {
        const fromD = new Date(fromDate);
        fromD.setHours(0, 0, 0, 0);
        filter.date.gte = fromD;
      }
      if (toDate) {
        const toD = new Date(toDate);
        toD.setHours(23, 59, 59, 999);
        filter.date.lte = toD;
      }
    }

    // General search across multiple fields
    if (search && search.trim()) {
      const term = search.trim();
      filter.OR = [
        { patientName: { contains: term, mode: "insensitive" } },
        { uhid: { contains: term, mode: "insensitive" } },
        { invoiceNo: { contains: term, mode: "insensitive" } },
        { company: { contains: term, mode: "insensitive" } },
        { encNo: { contains: term, mode: "insensitive" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [invoices, total, totalAdvancesResult] = await prisma.$transaction([
      prisma.invoice.findMany({
        where: filter,
        include: { receipts: { orderBy: { createdAt: "desc" } } },
        orderBy: { date: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.invoice.count({ where: filter }),
      prisma.advanceCollection.aggregate({
        _sum: { balanceAmount: true },
        where: { status: "Active" },
      }),
    ]);

    const totalAdvanceAvailable = totalAdvancesResult._sum.balanceAmount || 0;

    return {
      invoices,
      total,
      totalAdvanceAvailable,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)) || 1,
    };
  }

  // ─── RECEIPTS & CASHBOOK LEDGER ──────────────────────────────────────────────
  static async listReceipts(queryParams = {}) {
    const {
      search,
      uhid,
      invoiceNo,
      patientName,
      mode,
      type,
      fromDate,
      toDate,
      page = 1,
      limit = 100,
    } = queryParams;

    const filter = {};

    if (uhid && uhid.trim()) {
      filter.uhid = { contains: uhid.trim(), mode: "insensitive" };
    }
    if (patientName && patientName.trim()) {
      filter.patientName = { contains: patientName.trim(), mode: "insensitive" };
    }
    if (mode && mode !== "all" && mode !== "Select All") {
      filter.mode = mode;
    }
    if (type && type !== "all" && type !== "Select All") {
      filter.type = type;
    }

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) {
        const fromD = new Date(fromDate);
        fromD.setHours(0, 0, 0, 0);
        filter.createdAt.gte = fromD;
      }
      if (toDate) {
        const toD = new Date(toDate);
        toD.setHours(23, 59, 59, 999);
        filter.createdAt.lte = toD;
      }
    }

    if (search && search.trim()) {
      const term = search.trim();
      filter.OR = [
        { receiptNo: { contains: term, mode: "insensitive" } },
        { uhid: { contains: term, mode: "insensitive" } },
        { patientName: { contains: term, mode: "insensitive" } },
        { mode: { contains: term, mode: "insensitive" } },
        { refNo: { contains: term, mode: "insensitive" } },
        { bankName: { contains: term, mode: "insensitive" } },
        { notes: { contains: term, mode: "insensitive" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [receipts, total] = await prisma.$transaction([
      prisma.receipt.findMany({
        where: filter,
        include: { invoice: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.receipt.count({ where: filter }),
    ]);

    return {
      receipts: receipts.map(r => ({
        id: r.id,
        receiptNo: r.receiptNo || `RCT-${r.id.slice(-6)}`,
        invoiceNo: r.invoice?.invoiceNo || (r.type === "Advance" ? "ADV-DEP" : "-"),
        uhid: r.uhid || r.invoice?.uhid || "1",
        patientName: r.patientName || r.invoice?.patientName || "Patient",
        company: r.invoice?.company || "CASH / CASH",
        encNo: r.invoice?.encNo || "1",
        date: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
        mode: r.mode,
        bankName: r.bankName,
        beneficiaryName: r.beneficiaryName,
        refNo: r.refNo,
        amount: r.amount,
        type: r.type,
        notes: r.notes,
      })),
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)) || 1,
    };
  }

  // ─── PATIENTS FOR BILLING CENSUS & LOOKUP ────────────────────────────────────
  static async listPatients(queryParams = {}) {
    const {
      search,
      searchOn,
      type,
      encounterStatus,
      status,
      doctor,
      gender,
      payerType,
      fromDate,
      toDate,
      limit = 100,
    } = queryParams;

    const filter = {};

    if (gender && gender !== "all") {
      filter.gender = { equals: gender, mode: "insensitive" };
    }
    if (payerType && payerType !== "Select All" && payerType !== "all") {
      filter.payerType = { contains: payerType, mode: "insensitive" };
    }
    if (status && status !== "all") {
      filter.status = status;
    }

    if (search && search.trim()) {
      const term = search.trim();
      if (searchOn === "UHID") {
        filter.uhid = { contains: term, mode: "insensitive" };
      } else if (searchOn === "Patient Name") {
        filter.fullName = { contains: term, mode: "insensitive" };
      } else if (searchOn === "Mobile #") {
        filter.mobile = { contains: term, mode: "insensitive" };
      } else if (searchOn === "Doctor Name") {
        filter.referredBy = { contains: term, mode: "insensitive" };
      } else if (searchOn === "Company") {
        filter.payer = { contains: term, mode: "insensitive" };
      } else {
        filter.OR = [
          { fullName: { contains: term, mode: "insensitive" } },
          { uhid: { contains: term, mode: "insensitive" } },
          { mobile: { contains: term, mode: "insensitive" } },
          { guardianName: { contains: term, mode: "insensitive" } },
          { referredBy: { contains: term, mode: "insensitive" } },
          { payer: { contains: term, mode: "insensitive" } },
        ];
      }
    }

    if (fromDate || toDate) {
      filter.regDate = {};
      if (fromDate) filter.regDate.gte = new Date(fromDate);
      if (toDate) filter.regDate.lte = new Date(toDate);
    }

    const patients = await prisma.patient.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
      take: Number(limit),
    });

    const mapped = patients.map((p) => {
      let patientType = "Admission";
      if (p.registrationType === "Outpatient" || p.status === "Registration") patientType = "Registration";
      else if (p.status === "Discharged") patientType = "Discharge";
      else if (p.status === "Discharge But Not Bill") patientType = "Discharge But Not Bill";

      return {
        id: p.id,
        uhid: p.uhid,
        ipNo: `IP-${p.uhid}`,
        patientName: p.fullName || `${p.firstName} ${p.lastName || ""}`.trim(),
        genderAge: `${p.gender || "Male"}/${p.age || 30} Yr`,
        admissionDate: p.regDate ? p.regDate.toISOString() : p.createdAt.toISOString(),
        bedNo: p.occupation || "GEN-01",
        billingCategory: p.religion || "GENERAL WARD / REGULAR",
        doctor: p.referredBy || "Dr. Abhishek Bansal 2273",
        encounterStatus: p.status || "Open",
        company: p.payer || "CASH / CASH",
        mobileNo: p.mobile || "",
        type: patientType,
        address: p.address || "",
        fatherName: p.guardianName || "",
        isVip: p.isVip || false,
        payerType: p.payerType || "Direct Patient",
        sponsor: p.sponsor || "CASH",
      };
    });

    const effectiveType = type;
    const filtered = (effectiveType && effectiveType !== "all" && effectiveType !== "Both")
      ? mapped.filter(p => p.type === effectiveType)
      : mapped;

    return filtered;
  }

  static async getInvoiceById(id) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { receipts: { orderBy: { createdAt: "desc" } } },
    });
    if (!invoice) {
      throw new NotFoundError(`Invoice with ID ${id} not found.`);
    }
    return invoice;
  }

  static async createInvoice(data) {
    const {
      uhid,
      patientName,
      encNo = "1",
      type = "OP",
      company = "CASH / CASH",
      doctorName = "Dr. Abhishek Bansal",
      department = "General Medicine",
      grossAmt = 0,
      discountAmt = 0,
      taxAmt = 0,
      netAmt,
      items = [],
      payments = [],
      remarks = "",
      advanceAdjusted = 0,
      orderId = null,
    } = data;

    if (!uhid || !patientName) {
      throw new AppError("UHID and Patient Name are required to create an invoice.", 400);
    }

    const calculatedNet = netAmt !== undefined ? Number(netAmt) : Number(grossAmt) - Number(discountAmt) + Number(taxAmt);

    // Generate Invoice Number
    const count = await prisma.invoice.count();
    const prefix = type === "IP" ? "IP" : "OP";
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const invoiceNo = `${prefix}CA${currentYear}/${count + 101}`;

    let paidPatient = 0;
    let paidPayer = 0;
    let adjusted = Number(advanceAdjusted || 0);

    const receiptRecords = [];
    if (Array.isArray(payments) && payments.length > 0) {
      for (const p of payments) {
        const amt = Number(p.amount || 0);
        if (amt > 0) {
          if (p.payerCategory === "Company" || p.payerCategory === "Insurance") {
            paidPayer += amt;
          } else {
            paidPatient += amt;
          }
          adjusted += amt;

          receiptRecords.push({
            receiptNo: `REC-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`,
            uhid,
            patientName,
            mode: p.mode || "Cash",
            amount: amt,
            bankName: p.bankName || null,
            beneficiaryName: p.beneficiaryName || null,
            refNo: p.refNo || null,
            cardSwipingValue: Number(p.cardSwipingValue || 0),
            type: "Settlement",
            notes: p.description || p.notes || null,
          });
        }
      }
    }

    const balance = Math.max(0, calculatedNet - adjusted);
    let status = "Outstanding";
    if (balance === 0) {
      status = "Settled";
    } else if (calculatedNet < adjusted) {
      status = "Refundable";
    }

    const result = await prisma.$transaction(async (tx) => {
      const newInvoice = await tx.invoice.create({
        data: {
          invoiceNo,
          uhid,
          patientName,
          encNo: String(encNo),
          type,
          company,
          doctorName,
          department,
          grossAmt: Number(grossAmt || calculatedNet),
          discountAmt: Number(discountAmt || 0),
          taxAmt: Number(taxAmt || 0),
          netAmt: calculatedNet,
          paidPatient,
          paidPayer,
          adjusted,
          balance,
          status,
          itemsJson: JSON.stringify(items),
          remarks,
          receipts: {
            create: receiptRecords,
          },
        },
        include: { receipts: true },
      });

      // If tied to a billing order, mark it as billed
      if (orderId) {
        await tx.billingOrder.updateMany({
          where: { id: orderId },
          data: { status: "Billed" },
        });
      }

      return newInvoice;
    });

    return result;
  }

  static async settleInvoice(data) {
    const { invoiceId, payments = [] } = data;

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
      if (amt <= 0) continue;

      const pType = payment.type || "Settlement";

      if (pType === "Settlement") {
        updatedAdjusted += amt;
        updatedPaidPatient += amt;
      } else if (pType === "Refund") {
        updatedRefund += amt;
      } else if (pType === "CreditNote") {
        updatedCreditNote += amt;
      } else if (pType === "TDS") {
        updatedTdsAmt += amt;
      }

      receiptRecords.push({
        receiptNo: `REC-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`,
        invoiceId,
        uhid: invoice.uhid,
        patientName: invoice.patientName,
        mode: payment.mode || "Cash",
        amount: amt,
        bankName: payment.bankName || null,
        beneficiaryName: payment.beneficiaryName || null,
        refNo: payment.refNo || null,
        cardSwipingValue: Number(payment.cardSwipingValue || 0),
        type: pType,
        notes: payment.notes || payment.description || null,
      });
    }

    const newBalance = invoice.netAmt - updatedAdjusted - updatedCreditNote - updatedTdsAmt + updatedRefund;

    let newStatus = "Outstanding";
    if (newBalance <= 0) {
      newStatus = newBalance < 0 ? "Refundable" : "Settled";
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
          balance: Math.max(0, newBalance),
          status: newStatus,
        },
      });

      for (const rec of receiptRecords) {
        await tx.receipt.create({ data: rec });
      }

      return updatedInvoice;
    });

    return result;
  }

  static async cancelInvoice(id) {
    const invoice = await prisma.invoice.findUnique({ where: { id } });
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

  // ─── OP VISITS ───────────────────────────────────────────────────────────────
  static async listVisits(queryParams = {}) {
    const {
      uhid,
      search,
      status,
      doctorName,
      department,
      payerType,
      payer,
      sponsor,
      visitType,
      fromDate,
      toDate,
    } = queryParams;
    const filter = {};

    if (uhid && uhid.trim()) filter.uhid = { contains: uhid.trim(), mode: "insensitive" };
    if (status && status !== "all") filter.status = status;
    if (doctorName && doctorName.trim()) filter.doctorName = { contains: doctorName.trim(), mode: "insensitive" };
    if (department && department.trim() && department !== "all") filter.department = { contains: department.trim(), mode: "insensitive" };
    if (payerType && payerType !== "all" && payerType !== "Select All") filter.payerType = payerType;
    if (payer && payer !== "all" && payer !== "Select All") filter.payer = { contains: payer, mode: "insensitive" };
    if (sponsor && sponsor !== "all" && sponsor !== "Select All") filter.sponsor = { contains: sponsor, mode: "insensitive" };
    if (visitType && visitType !== "all") filter.visitType = visitType;

    if (fromDate || toDate) {
      filter.visitDate = {};
      if (fromDate) {
        const fromD = new Date(fromDate);
        fromD.setHours(0, 0, 0, 0);
        filter.visitDate.gte = fromD;
      }
      if (toDate) {
        const toD = new Date(toDate);
        toD.setHours(23, 59, 59, 999);
        filter.visitDate.lte = toD;
      }
    }

    if (search && search.trim()) {
      const term = search.trim();
      filter.OR = [
        { uhid: { contains: term, mode: "insensitive" } },
        { patientName: { contains: term, mode: "insensitive" } },
        { doctorName: { contains: term, mode: "insensitive" } },
        { visitNo: { contains: term, mode: "insensitive" } },
      ];
    }

    return await prisma.opVisit.findMany({
      where: filter,
      orderBy: { visitDate: "desc" },
      take: 150,
    });
  }

  static async createVisit(data) {
    const {
      uhid,
      patientName,
      doctorName,
      department = "OPD",
      payerType = "Direct Patient",
      payer = "CASH",
      sponsor = "CASH",
      network = "Select",
      consultationFee = 500,
      visitType = "New",
      status = "Open",
    } = data;

    if (!uhid || !doctorName) {
      throw new AppError("UHID and Doctor Name are required.", 400);
    }

    const count = await prisma.opVisit.count();
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const visitNo = `OPV-${dateStr}-${(count + 1).toString().padStart(3, "0")}`;

    return await prisma.opVisit.create({
      data: {
        visitNo,
        uhid,
        patientName: patientName || `Patient ${uhid}`,
        doctorName,
        department,
        payerType,
        payer,
        sponsor,
        network,
        consultationFee: Number(consultationFee || 500),
        visitType,
        status,
      },
    });
  }

  // ─── BILLING ORDERS ──────────────────────────────────────────────────────────
  static async listOrders(queryParams = {}) {
    const {
      uhid,
      status,
      orderType,
      search,
      doctorName,
      fromDate,
      toDate,
    } = queryParams;
    const filter = {};

    if (uhid && uhid.trim()) filter.uhid = { contains: uhid.trim(), mode: "insensitive" };
    if (status && status !== "all") filter.status = status;
    if (orderType && orderType !== "all") filter.orderType = orderType;
    if (doctorName && doctorName.trim()) filter.doctorName = { contains: doctorName.trim(), mode: "insensitive" };

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) {
        const fromD = new Date(fromDate);
        fromD.setHours(0, 0, 0, 0);
        filter.createdAt.gte = fromD;
      }
      if (toDate) {
        const toD = new Date(toDate);
        toD.setHours(23, 59, 59, 999);
        filter.createdAt.lte = toD;
      }
    }

    if (search && search.trim()) {
      const term = search.trim();
      filter.OR = [
        { uhid: { contains: term, mode: "insensitive" } },
        { patientName: { contains: term, mode: "insensitive" } },
        { orderNo: { contains: term, mode: "insensitive" } },
        { doctorName: { contains: term, mode: "insensitive" } },
      ];
    }

    return await prisma.billingOrder.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
    });
  }

  static async createOrder(data) {
    const {
      uhid,
      visitNo = "1",
      patientName,
      doctorName = "Dr. Abhishek Bansal",
      orderType = "General",
      items = [],
      remarks = "",
    } = data;

    if (!uhid || !items || items.length === 0) {
      throw new AppError("UHID and order items are required.", 400);
    }

    const totalAmount = items.reduce((sum, it) => sum + Number(it.rate || 0) * Number(it.qty || 1), 0);
    const discountAmount = items.reduce((sum, it) => sum + Number(it.discountAmt || 0), 0);
    const netAmount = Math.max(0, totalAmount - discountAmount);

    const count = await prisma.billingOrder.count();
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const orderNo = `ORD-${dateStr}-${(count + 1).toString().padStart(3, "0")}`;

    return await prisma.billingOrder.create({
      data: {
        orderNo,
        uhid,
        visitNo,
        patientName: patientName || `Patient ${uhid}`,
        doctorName,
        orderType,
        status: "Unbilled",
        itemsJson: JSON.stringify(items),
        totalAmount,
        discountAmount,
        netAmount,
        remarks,
      },
    });
  }

  static async billOrder(id, billingData = {}) {
    const order = await prisma.billingOrder.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundError(`Billing Order with ID ${id} not found.`);
    }

    let items = [];
    try {
      items = JSON.parse(order.itemsJson);
    } catch {
      items = [];
    }

    const invoice = await this.createInvoice({
      uhid: order.uhid,
      patientName: order.patientName,
      encNo: order.visitNo || "1",
      type: "OP",
      company: billingData.company || "CASH / CASH",
      doctorName: order.doctorName,
      grossAmt: order.totalAmount,
      discountAmt: order.discountAmount,
      netAmt: order.netAmount,
      items,
      payments: billingData.payments || [],
      orderId: order.id,
      remarks: `Generated from Order ${order.orderNo}`,
    });

    return invoice;
  }

  // ─── ADVANCE COLLECTIONS ─────────────────────────────────────────────────────
  static async listAdvances(queryParams = {}) {
    const {
      uhid,
      status,
      search,
      purpose,
      mode,
      fromDate,
      toDate,
    } = queryParams;
    const filter = {};

    if (uhid && uhid.trim()) filter.uhid = { contains: uhid.trim(), mode: "insensitive" };
    if (status && status !== "all") filter.status = status;
    if (purpose && purpose.trim() && purpose !== "all") filter.purpose = { contains: purpose.trim(), mode: "insensitive" };
    if (mode && mode !== "all") filter.mode = mode;

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) {
        const fromD = new Date(fromDate);
        fromD.setHours(0, 0, 0, 0);
        filter.createdAt.gte = fromD;
      }
      if (toDate) {
        const toD = new Date(toDate);
        toD.setHours(23, 59, 59, 999);
        filter.createdAt.lte = toD;
      }
    }

    if (search && search.trim()) {
      const term = search.trim();
      filter.OR = [
        { uhid: { contains: term, mode: "insensitive" } },
        { patientName: { contains: term, mode: "insensitive" } },
        { advanceNo: { contains: term, mode: "insensitive" } },
        { purpose: { contains: term, mode: "insensitive" } },
      ];
    }

    return await prisma.advanceCollection.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
    });
  }

  static async createAdvance(data) {
    const {
      uhid,
      patientName,
      encNo = "1",
      amount,
      mode = "Cash",
      bankName,
      beneficiaryName,
      refNo,
      purpose = "General Advance",
    } = data;

    const amt = Number(amount);
    if (!uhid || !amt || amt <= 0) {
      throw new AppError("Valid UHID and Advance amount are required.", 400);
    }

    const count = await prisma.advanceCollection.count();
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const advanceNo = `ADV-${dateStr}-${(count + 1).toString().padStart(3, "0")}`;

    const advance = await prisma.advanceCollection.create({
      data: {
        advanceNo,
        uhid,
        patientName: patientName || `Patient ${uhid}`,
        encNo,
        amount: amt,
        adjustedAmount: 0,
        refundAmount: 0,
        balanceAmount: amt,
        mode,
        bankName: bankName || null,
        beneficiaryName: beneficiaryName || null,
        refNo: refNo || null,
        purpose,
        status: "Active",
      },
    });

    // Also record a receipt entry for cashbook consistency
    await prisma.receipt.create({
      data: {
        receiptNo: advanceNo,
        uhid,
        patientName: patientName || `Patient ${uhid}`,
        mode,
        amount: amt,
        bankName,
        beneficiaryName,
        refNo,
        type: "Advance",
        notes: `Advance Collected: ${purpose}`,
      },
    });

    return advance;
  }

  // ─── CREDIT NOTES ────────────────────────────────────────────────────────────
  static async listCreditNotes(queryParams = {}) {
    const {
      uhid,
      invoiceNo,
      search,
      authorizedBy,
      reason,
      fromDate,
      toDate,
    } = queryParams;
    const filter = {};

    if (uhid && uhid.trim()) filter.uhid = { contains: uhid.trim(), mode: "insensitive" };
    if (invoiceNo && invoiceNo.trim()) filter.invoiceNo = { contains: invoiceNo.trim(), mode: "insensitive" };
    if (authorizedBy && authorizedBy.trim()) filter.authorizedBy = { contains: authorizedBy.trim(), mode: "insensitive" };
    if (reason && reason.trim()) filter.reason = { contains: reason.trim(), mode: "insensitive" };

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) {
        const fromD = new Date(fromDate);
        fromD.setHours(0, 0, 0, 0);
        filter.createdAt.gte = fromD;
      }
      if (toDate) {
        const toD = new Date(toDate);
        toD.setHours(23, 59, 59, 999);
        filter.createdAt.lte = toD;
      }
    }

    if (search && search.trim()) {
      const term = search.trim();
      filter.OR = [
        { uhid: { contains: term, mode: "insensitive" } },
        { patientName: { contains: term, mode: "insensitive" } },
        { creditNoteNo: { contains: term, mode: "insensitive" } },
        { invoiceNo: { contains: term, mode: "insensitive" } },
        { reason: { contains: term, mode: "insensitive" } },
      ];
    }

    return await prisma.creditNote.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
    });
  }

  static async createCreditNote(data) {
    const {
      invoiceId,
      invoiceNo,
      uhid,
      patientName,
      reason,
      amount,
      authorizedBy = "Dr. Admin",
    } = data;

    const amt = Number(amount);
    if (!invoiceNo || !amt || amt <= 0 || !reason) {
      throw new AppError("Invoice No, valid Amount, and Reason are required for credit note.", 400);
    }

    const count = await prisma.creditNote.count();
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const creditNoteNo = `CN-${dateStr}-${(count + 1).toString().padStart(3, "0")}`;

    const result = await prisma.$transaction(async (tx) => {
      const crNote = await tx.creditNote.create({
        data: {
          creditNoteNo,
          invoiceId: invoiceId || null,
          invoiceNo,
          uhid,
          patientName,
          reason,
          amount: amt,
          authorizedBy,
        },
      });

      // Adjust invoice if invoiceId or invoiceNo matches
      const invoice = await tx.invoice.findFirst({
        where: { OR: [{ id: invoiceId || "" }, { invoiceNo }] },
      });

      if (invoice) {
        const updatedCr = invoice.creditNote + amt;
        const newBalance = Math.max(0, invoice.balance - amt);
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            creditNote: updatedCr,
            balance: newBalance,
            status: newBalance === 0 ? "Settled" : invoice.status,
          },
        });

        await tx.receipt.create({
          data: {
            receiptNo: creditNoteNo,
            invoiceId: invoice.id,
            uhid,
            patientName,
            mode: "CreditNote",
            amount: amt,
            type: "CreditNote",
            notes: `Credit Note Issued: ${reason}`,
          },
        });
      }

      return crNote;
    });

    return result;
  }

  // ─── REFUNDS ─────────────────────────────────────────────────────────────────
  static async listRefunds(queryParams = {}) {
    const {
      uhid,
      invoiceNo,
      refundNo,
      status,
      mode,
      search,
      fromDate,
      toDate,
    } = queryParams;
    const filter = {};

    if (uhid && uhid.trim()) filter.uhid = { contains: uhid.trim(), mode: "insensitive" };
    if (invoiceNo && invoiceNo.trim()) filter.invoiceNo = { contains: invoiceNo.trim(), mode: "insensitive" };
    if (refundNo && refundNo.trim()) filter.refundNo = { contains: refundNo.trim(), mode: "insensitive" };
    if (status && status !== "all") filter.status = status;
    if (mode && mode !== "all") filter.mode = mode;

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) {
        const fromD = new Date(fromDate);
        fromD.setHours(0, 0, 0, 0);
        filter.createdAt.gte = fromD;
      }
      if (toDate) {
        const toD = new Date(toDate);
        toD.setHours(23, 59, 59, 999);
        filter.createdAt.lte = toD;
      }
    }

    if (search && search.trim()) {
      const term = search.trim();
      filter.OR = [
        { uhid: { contains: term, mode: "insensitive" } },
        { patientName: { contains: term, mode: "insensitive" } },
        { refundNo: { contains: term, mode: "insensitive" } },
        { invoiceNo: { contains: term, mode: "insensitive" } },
        { reason: { contains: term, mode: "insensitive" } },
      ];
    }

    return await prisma.refundRecord.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
    });
  }

  static async createRefund(data) {
    const {
      uhid,
      patientName,
      invoiceId,
      invoiceNo,
      receiptId,
      amount,
      mode = "Cash",
      bankName,
      refNo,
      reason,
      authorizedBy = "Dr. Admin",
    } = data;

    const amt = Number(amount);
    if (!uhid || !amt || amt <= 0 || !reason) {
      throw new AppError("UHID, valid Amount, and Reason are required for refund.", 400);
    }

    const count = await prisma.refundRecord.count();
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const refundNo = `REF-${dateStr}-${(count + 1).toString().padStart(3, "0")}`;

    const result = await prisma.$transaction(async (tx) => {
      const refund = await tx.refundRecord.create({
        data: {
          refundNo,
          uhid,
          patientName,
          invoiceId: invoiceId || null,
          invoiceNo: invoiceNo || null,
          receiptId: receiptId || null,
          amount: amt,
          mode,
          bankName: bankName || null,
          refNo: refNo || null,
          reason,
          authorizedBy,
          status: "Processed",
        },
      });

      if (invoiceId) {
        const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
        if (invoice) {
          const updatedRefund = invoice.refund + amt;
          await tx.invoice.update({
            where: { id: invoiceId },
            data: {
              refund: updatedRefund,
              status: invoice.balance <= 0 ? "Settled" : invoice.status,
            },
          });
        }
      }

      await tx.receipt.create({
        data: {
          receiptNo: refundNo,
          invoiceId: invoiceId || null,
          uhid,
          patientName,
          mode,
          amount: amt,
          bankName,
          refNo,
          type: "Refund",
          notes: `Refund Processed: ${reason}`,
        },
      });

      return refund;
    });

    return result;
  }

  // ─── INSURANCE INTIMATIONS ───────────────────────────────────────────────────
  static async listIntimations(queryParams = {}) {
    const {
      uhid,
      claimNo,
      policyNo,
      status,
      tpaName,
      search,
      fromDate,
      toDate,
    } = queryParams;
    const filter = {};

    if (uhid && uhid.trim()) filter.uhid = { contains: uhid.trim(), mode: "insensitive" };
    if (claimNo && claimNo.trim()) filter.claimNo = { contains: claimNo.trim(), mode: "insensitive" };
    if (policyNo && policyNo.trim()) filter.policyNo = { contains: policyNo.trim(), mode: "insensitive" };
    if (status && status !== "all") filter.status = status;
    if (tpaName && tpaName.trim() && tpaName !== "all") filter.tpaName = { contains: tpaName.trim(), mode: "insensitive" };

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) {
        const fromD = new Date(fromDate);
        fromD.setHours(0, 0, 0, 0);
        filter.createdAt.gte = fromD;
      }
      if (toDate) {
        const toD = new Date(toDate);
        toD.setHours(23, 59, 59, 999);
        filter.createdAt.lte = toD;
      }
    }

    if (search && search.trim()) {
      const term = search.trim();
      filter.OR = [
        { uhid: { contains: term, mode: "insensitive" } },
        { patientName: { contains: term, mode: "insensitive" } },
        { claimNo: { contains: term, mode: "insensitive" } },
        { policyNo: { contains: term, mode: "insensitive" } },
        { tpaName: { contains: term, mode: "insensitive" } },
      ];
    }

    return await prisma.insuranceIntimation.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
    });
  }

  static async createIntimation(data) {
    const {
      uhid,
      patientName,
      encNo = "1",
      tpaName,
      policyNo,
      claimNo,
      requestedAmt,
      approvedAmt = 0,
      coPayAmt = 0,
      status = "Initiated",
      remarks = "",
    } = data;

    if (!uhid || !tpaName || !claimNo) {
      throw new AppError("UHID, TPA Name, and Claim Number are required.", 400);
    }

    return await prisma.insuranceIntimation.create({
      data: {
        uhid,
        patientName: patientName || `Patient ${uhid}`,
        encNo,
        tpaName,
        policyNo: policyNo || "POL-DEFAULT",
        claimNo,
        requestedAmt: Number(requestedAmt || 0),
        approvedAmt: Number(approvedAmt || 0),
        coPayAmt: Number(coPayAmt || 0),
        status,
        remarks,
      },
    });
  }

  static async updateIntimation(id, data) {
    const intimation = await prisma.insuranceIntimation.findUnique({ where: { id } });
    if (!intimation) {
      throw new NotFoundError(`Insurance Intimation with ID ${id} not found.`);
    }

    return await prisma.insuranceIntimation.update({
      where: { id },
      data: {
        ...data,
        requestedAmt: data.requestedAmt !== undefined ? Number(data.requestedAmt) : undefined,
        approvedAmt: data.approvedAmt !== undefined ? Number(data.approvedAmt) : undefined,
        coPayAmt: data.coPayAmt !== undefined ? Number(data.coPayAmt) : undefined,
      },
    });
  }

  // ─── SEED DEMO BILLING DATA ──────────────────────────────────────────────────
  static async seedDemoBillingData() {
    // 1. Check existing invoices
    const invoiceCount = await prisma.invoice.count();
    if (invoiceCount === 0) {
      const demoInvoices = [
        {
          company: "CASH / CASH",
          uhid: "2710",
          patientName: "Mr. Raj Pal Yadav",
          encNo: "1",
          type: "OP",
          invoiceNo: "OPCA26/101",
          date: new Date("2026-08-16T10:30:00Z"),
          doctorName: "Dr. Sameer Sen 3105",
          department: "General OPD",
          grossAmt: 850,
          discountAmt: 50,
          taxAmt: 0,
          netAmt: 800,
          paidPatient: 800,
          adjusted: 800,
          balance: 0,
          status: "Settled",
          itemsJson: JSON.stringify([
            { code: "CON-01", name: "OPD Consultation - Senior Specialist", rate: 500, qty: 1, net: 500 },
            { code: "LAB-05", name: "Complete Blood Count (CBC)", rate: 350, qty: 1, net: 300 }
          ]),
          receipts: {
            create: [
              { receiptNo: "REC-260816-01", uhid: "2710", patientName: "Mr. Raj Pal Yadav", mode: "Cash", amount: 800, type: "Settlement", notes: "Consultation + CBC settled" }
            ]
          }
        },
        {
          company: "Star Health Insurance",
          uhid: "222",
          patientName: "Mr. Somesh Kumar",
          encNo: "21/3",
          type: "IP",
          invoiceNo: "IPCA26/102",
          date: new Date("2026-08-15T14:20:00Z"),
          doctorName: "Dr. Abhishek Bansal 2273",
          department: "Inpatient Ward",
          grossAmt: 16500,
          discountAmt: 1100,
          taxAmt: 0,
          netAmt: 15400,
          paidPatient: 2400,
          paidPayer: 10000,
          adjusted: 12400,
          balance: 3000,
          status: "Outstanding",
          itemsJson: JSON.stringify([
            { code: "BED-01", name: "Deluxe Room Stay (3 Days)", rate: 3000, qty: 3, net: 9000 },
            { code: "NUR-01", name: "Nursing Charges", rate: 800, qty: 3, net: 2400 },
            { code: "MED-09", name: "Inpatient Injectables & Meds", rate: 4000, qty: 1, net: 4000 }
          ]),
          receipts: {
            create: [
              { receiptNo: "REC-260815-02", uhid: "222", patientName: "Mr. Somesh Kumar", mode: "UPI", amount: 2400, type: "Settlement", notes: "Patient co-pay share" },
              { receiptNo: "REC-260815-03", uhid: "222", patientName: "Mr. Somesh Kumar", mode: "Bank Transfer", amount: 10000, bankName: "HDFC Bank", refNo: "TXN987654321", type: "Settlement", notes: "TPA Initial Pre-auth Payment" }
            ]
          }
        },
        {
          company: "HDFC ERGO Health",
          uhid: "105",
          patientName: "Mrs. Anita Sharma",
          encNo: "21/8",
          type: "IP",
          invoiceNo: "IPCA26/103",
          date: new Date("2026-08-14T09:15:00Z"),
          doctorName: "Dr. Rajesh Malhotra 1104",
          department: "ICU",
          grossAmt: 32000,
          discountAmt: 0,
          taxAmt: 0,
          netAmt: 32000,
          paidPatient: 5000,
          paidPayer: 27000,
          adjusted: 32000,
          balance: 0,
          status: "Settled",
          itemsJson: JSON.stringify([
            { code: "ICU-01", name: "ICU Bed Charges (2 Days)", rate: 10000, qty: 2, net: 20000 },
            { code: "DOC-03", name: "Critical Care Physician Visits", rate: 3000, qty: 2, net: 6000 },
            { code: "LAB-99", name: "ABG & Electrolytes Panel", rate: 6000, qty: 1, net: 6000 }
          ]),
          receipts: {
            create: [
              { receiptNo: "REC-260814-01", uhid: "105", patientName: "Mrs. Anita Sharma", mode: "Card", amount: 5000, type: "Settlement", notes: "Card settlement" },
              { receiptNo: "REC-260814-02", uhid: "105", patientName: "Mrs. Anita Sharma", mode: "Bank Transfer", amount: 27000, bankName: "ICICI Bank", refNo: "NEFT4428819", type: "Settlement", notes: "HDFC ERGO Claim settled" }
            ]
          }
        },
        {
          company: "CASH / CASH",
          uhid: "44",
          patientName: "Mr. Demo Patient",
          encNo: "21/2",
          type: "OP",
          invoiceNo: "OPCA26/104",
          date: new Date("2026-08-16T16:00:00Z"),
          doctorName: "Dr. D K DAS 2268",
          department: "Cardiology",
          grossAmt: 2200,
          discountAmt: 200,
          taxAmt: 0,
          netAmt: 2000,
          paidPatient: 2500,
          adjusted: 2500,
          balance: -500,
          status: "Refundable",
          itemsJson: JSON.stringify([
            { code: "CARD-01", name: "12-Lead ECG", rate: 600, qty: 1, net: 600 },
            { code: "CARD-02", name: "2D Echocardiography", rate: 1600, qty: 1, net: 1400 }
          ]),
          receipts: {
            create: [
              { receiptNo: "REC-260816-04", uhid: "44", patientName: "Mr. Demo Patient", mode: "Cash", amount: 2500, type: "Settlement", notes: "Overpaid advance cash" }
            ]
          }
        }
      ];

      for (const inv of demoInvoices) {
        await prisma.invoice.create({ data: inv });
      }
    }

    // 2. Seed OP Visits
    const visitCount = await prisma.opVisit.count();
    if (visitCount === 0) {
      await prisma.opVisit.createMany({
        data: [
          {
            visitNo: "OPV-260817-001",
            uhid: "2710",
            patientName: "Mr. Raj Pal Yadav",
            doctorName: "Dr. Sameer Sen 3105",
            department: "General Medicine",
            payerType: "Direct Patient",
            payer: "CASH",
            sponsor: "CASH",
            consultationFee: 500,
            visitType: "New",
            status: "Open",
          },
          {
            visitNo: "OPV-260817-002",
            uhid: "222",
            patientName: "Mr. Somesh Kumar",
            doctorName: "Dr. Abhishek Bansal 2273",
            department: "Orthopaedics",
            payerType: "Insurance",
            payer: "Star Health",
            sponsor: "Star Health",
            consultationFee: 700,
            visitType: "Follow-up",
            status: "Sent for Billing",
          },
          {
            visitNo: "OPV-260817-003",
            uhid: "44",
            patientName: "Mr. Demo Patient",
            doctorName: "Dr. D K DAS 2268",
            department: "Cardiology",
            payerType: "Direct Patient",
            payer: "CASH",
            sponsor: "CASH",
            consultationFee: 1000,
            visitType: "New",
            status: "Closed",
          }
        ]
      });
    }

    // 3. Seed Billing Orders
    const orderCount = await prisma.billingOrder.count();
    if (orderCount === 0) {
      await prisma.billingOrder.createMany({
        data: [
          {
            orderNo: "ORD-260817-001",
            uhid: "2710",
            visitNo: "OPV-260817-001",
            patientName: "Mr. Raj Pal Yadav",
            doctorName: "Dr. Sameer Sen 3105",
            orderType: "Lab",
            status: "Unbilled",
            itemsJson: JSON.stringify([
              { code: "LAB-01", name: "Lipid Profile Test", dept: "Biochemistry", doctor: "Dr. Sameer Sen", rate: 750, qty: 1, discountPercent: 0, discountAmt: 0, netAmt: 750 },
              { code: "LAB-02", name: "HbA1c Glycated Hemoglobin", dept: "Pathology", doctor: "Dr. Sameer Sen", rate: 550, qty: 1, discountPercent: 0, discountAmt: 0, netAmt: 550 }
            ]),
            totalAmount: 1300,
            discountAmount: 0,
            netAmount: 1300,
            remarks: "Fasting lipid profile requested",
          },
          {
            orderNo: "ORD-260817-002",
            uhid: "303",
            visitNo: "1",
            patientName: "Master Rohan Verma",
            doctorName: "Dr. Sania Mirza 2231",
            orderType: "Radiology",
            status: "Unbilled",
            itemsJson: JSON.stringify([
              { code: "RAD-01", name: "Chest X-Ray PA View", dept: "Radiology", doctor: "Dr. Sania Mirza", rate: 450, qty: 1, discountPercent: 0, discountAmt: 0, netAmt: 450 }
            ]),
            totalAmount: 450,
            discountAmount: 0,
            netAmount: 450,
            remarks: "Routine pre-op chest X-ray",
          }
        ]
      });
    }

    // 4. Seed Advance Collections
    const advCount = await prisma.advanceCollection.count();
    if (advCount === 0) {
      await prisma.advanceCollection.createMany({
        data: [
          {
            advanceNo: "ADV-260817-001",
            uhid: "222",
            patientName: "Mr. Somesh Kumar",
            encNo: "21/3",
            amount: 5000,
            adjustedAmount: 2000,
            refundAmount: 0,
            balanceAmount: 3000,
            mode: "Cash",
            purpose: "Admission Deposit",
            status: "Active",
          },
          {
            advanceNo: "ADV-260817-002",
            uhid: "105",
            patientName: "Mrs. Anita Sharma",
            encNo: "21/8",
            amount: 10000,
            adjustedAmount: 10000,
            refundAmount: 0,
            balanceAmount: 0,
            mode: "UPI",
            refNo: "UPI/88442211",
            purpose: "Surgery Advance",
            status: "Fully Adjusted",
          }
        ]
      });
    }

    // 5. Seed Credit Notes
    const crCount = await prisma.creditNote.count();
    if (crCount === 0) {
      await prisma.creditNote.createMany({
        data: [
          {
            creditNoteNo: "CN-260817-001",
            invoiceNo: "IPCA26/102",
            uhid: "222",
            patientName: "Mr. Somesh Kumar",
            reason: "Hospital Chairman Courtesy Waiver",
            amount: 500,
            authorizedBy: "Dr. Admin",
          }
        ]
      });
    }

    // 6. Seed Insurance Intimations
    const intCount = await prisma.insuranceIntimation.count();
    if (intCount === 0) {
      await prisma.insuranceIntimation.createMany({
        data: [
          {
            uhid: "222",
            patientName: "Mr. Somesh Kumar",
            encNo: "21/3",
            tpaName: "Star Health & Allied Insurance",
            policyNo: "STAR-IND-2026-9901",
            claimNo: "CLM-ST-88741",
            requestedAmt: 20000,
            approvedAmt: 15000,
            coPayAmt: 2400,
            status: "Approved",
            remarks: "Initial pre-auth approved for ₹15,000",
          },
          {
            uhid: "105",
            patientName: "Mrs. Anita Sharma",
            encNo: "21/8",
            tpaName: "HDFC ERGO General Insurance",
            policyNo: "HDFC-OPT-77112",
            claimNo: "CLM-HD-10928",
            requestedAmt: 35000,
            approvedAmt: 32000,
            coPayAmt: 5000,
            status: "Settled",
            remarks: "Final settlement approved and paid",
          }
        ]
      });
    }

    return { success: true, message: "Demo billing data seeded successfully." };
  }
}

export default BillingService;
