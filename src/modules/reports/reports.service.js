import { prisma } from "../../config/database.js";


export class ReportsService {
  // ─── REVENUE REPORT ────────────────────────────────────────────────────────
  static async getRevenueReport(queryParams = {}) {
    const { fromDate, toDate, location, groupBy = "Department", companyWise } = queryParams;
    const filter = { isCancelled: false };

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

    const invoices = await prisma.invoice.findMany({
      where: filter,
      include: { receipts: true },
      orderBy: { date: "desc" },
    });

    const groups = {};
    let totalGross = 0;
    let totalDiscount = 0;
    let totalNet = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;

    invoices.forEach((inv) => {
      let key = "General OPD";
      if (groupBy === "Doctor") key = inv.doctorName || "Dr. General";
      else if (groupBy === "Department") key = inv.department || "General OPD";
      else if (groupBy === "Speciality") key = (inv.department || "General") + " Speciality";
      else if (groupBy === "Bed Category") key = inv.type === "IP" ? "Deluxe Ward" : "OP Consultation";
      else if (groupBy === "Ward/Floor") key = inv.type === "IP" ? "Floor 2 - Inpatient" : "Ground Floor - OPD";

      if (companyWise && inv.company) {
        key = `${key} [${inv.company}]`;
      }

      if (!groups[key]) {
        groups[key] = {
          name: key,
          billCount: 0,
          grossAmt: 0,
          discountAmt: 0,
          netAmt: 0,
          collectedAmt: 0,
          outstandingAmt: 0,
        };
      }

      groups[key].billCount += 1;
      groups[key].grossAmt += inv.grossAmt || inv.netAmt;
      groups[key].discountAmt += inv.discountAmt || 0;
      groups[key].netAmt += inv.netAmt || 0;
      groups[key].collectedAmt += (inv.paidPatient || 0) + (inv.paidPayer || 0) + (inv.adjusted || 0);
      groups[key].outstandingAmt += inv.balance || 0;

      totalGross += inv.grossAmt || inv.netAmt;
      totalDiscount += inv.discountAmt || 0;
      totalNet += inv.netAmt || 0;
      totalCollected += (inv.paidPatient || 0) + (inv.paidPayer || 0) + (inv.adjusted || 0);
      totalOutstanding += inv.balance || 0;
    });

    return {
      reportType: "Revenue",
      groupBy,
      location: location || "All Locations",
      fromDate: fromDate || "All Time",
      toDate: toDate || "All Time",
      summary: {
        totalBills: invoices.length,
        totalGross,
        totalDiscount,
        totalNet,
        totalCollected,
        totalOutstanding,
      },
      data: Object.values(groups),
      rawInvoices: invoices.slice(0, 100),
    };
  }

  // ─── COLLECTIONS / CASHBOOK REPORT ─────────────────────────────────────────
  static async getCollectionsReport(queryParams = {}) {
    const { fromDate, toDate, mode, groupBy = "Payment Mode" } = queryParams;
    const filter = {};

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

    if (mode && mode !== "all") {
      filter.mode = mode;
    }

    const receipts = await prisma.receipt.findMany({
      where: filter,
      include: { invoice: true },
      orderBy: { createdAt: "desc" },
    });

    const groups = {};
    let totalCollection = 0;

    receipts.forEach((r) => {
      let key = r.mode || "Cash";
      if (groupBy === "Cashier") key = "Main Billing Counter (Dr. Admin)";
      else if (groupBy === "Department") key = r.invoice?.department || (r.type === "Advance" ? "Advance Deposit" : "OPD Billing");
      else if (groupBy === "Shift") key = "General Shift (08:00 - 20:00)";

      if (!groups[key]) {
        groups[key] = {
          name: key,
          count: 0,
          amount: 0,
          cashAmt: 0,
          cardAmt: 0,
          upiAmt: 0,
          otherAmt: 0,
        };
      }

      groups[key].count += 1;
      groups[key].amount += r.amount || 0;
      totalCollection += r.amount || 0;

      if (r.mode === "Cash") groups[key].cashAmt += r.amount;
      else if (r.mode === "Card") groups[key].cardAmt += r.amount;
      else if (r.mode === "UPI") groups[key].upiAmt += r.amount;
      else groups[key].otherAmt += r.amount;
    });

    return {
      reportType: "Collections",
      groupBy,
      totalCollection,
      totalTransactions: receipts.length,
      data: Object.values(groups),
      rawReceipts: receipts.slice(0, 100).map((r) => ({
        id: r.id,
        receiptNo: r.receiptNo,
        date: r.createdAt,
        uhid: r.uhid || r.invoice?.uhid || "1",
        patientName: r.patientName || r.invoice?.patientName || "Patient",
        mode: r.mode,
        amount: r.amount,
        type: r.type,
        invoiceNo: r.invoice?.invoiceNo || (r.type === "Advance" ? "ADV-DEP" : "-"),
        bankName: r.bankName,
        refNo: r.refNo,
      })),
    };
  }

  // ─── BILL REGISTER REPORT ───────────────────────────────────────────────────
  static async getBillRegisterReport(queryParams = {}) {
    const { fromDate, toDate, type, status } = queryParams;
    const filter = {};

    if (type && type !== "all" && type !== "Both") filter.type = type;
    if (status && status !== "all") filter.status = status;

    if (fromDate || toDate) {
      filter.date = {};
      if (fromDate) filter.date.gte = new Date(fromDate);
      if (toDate) filter.date.lte = new Date(toDate);
    }

    const invoices = await prisma.invoice.findMany({
      where: filter,
      include: { receipts: true },
      orderBy: { date: "desc" },
    });

    const summary = {
      totalBills: invoices.length,
      opBills: invoices.filter((i) => i.type === "OP").length,
      ipBills: invoices.filter((i) => i.type === "IP").length,
      settledBills: invoices.filter((i) => i.status === "Settled").length,
      outstandingBills: invoices.filter((i) => i.status === "Outstanding").length,
      totalAmount: invoices.reduce((s, i) => s + i.netAmt, 0),
      totalBalance: invoices.reduce((s, i) => s + i.balance, 0),
    };

    return {
      reportType: "Bill Register",
      summary,
      invoices,
    };
  }

  // ─── ADMISSION, DISCHARGE & ATD CENSUS REPORT ────────────────────────────────
  static async getAtdCensusReport(queryParams = {}) {
    const { fromDate, toDate, status } = queryParams;
    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    const patients = await prisma.patient.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
    });

    const totalAdmitted = patients.filter((p) => p.status === "Open" || p.status === "Admitted").length;
    const totalDischarged = patients.filter((p) => p.status === "Discharged").length;
    const pendingBill = patients.filter((p) => p.status === "Discharge But Not Bill").length;

    return {
      reportType: "ATD Census",
      summary: {
        totalPatients: patients.length,
        totalAdmitted,
        totalDischarged,
        pendingBill,
        bedOccupancyRate: `${Math.min(100, Math.round((totalAdmitted / 30) * 100))}%`,
      },
      patients: patients.map((p) => ({
        id: p.id,
        uhid: p.uhid,
        ipNo: `IP-${p.uhid}`,
        name: p.fullName || `${p.firstName} ${p.lastName || ""}`.trim(),
        genderAge: `${p.gender || "Male"}/${p.age || 35} Yr`,
        bedNo: p.occupation || "GEN-01",
        doctor: p.referredBy || "Dr. Abhishek Bansal 2273",
        status: p.status || "Open",
        company: p.payer || "CASH / CASH",
        regDate: p.regDate || p.createdAt,
      })),
    };
  }

  // ─── OUTSTANDING AGING REPORT ────────────────────────────────────────────────
  static async getOutstandingReport(queryParams = {}) {
    const filter = {
      balance: { gt: 0 },
      isCancelled: false,
    };

    const invoices = await prisma.invoice.findMany({
      where: filter,
      orderBy: { date: "desc" },
    });

    const now = new Date();
    const buckets = {
      "0-30 Days": { range: "0-30 Days", count: 0, amount: 0, invoices: [] },
      "31-60 Days": { range: "31-60 Days", count: 0, amount: 0, invoices: [] },
      "61-90 Days": { range: "61-90 Days", count: 0, amount: 0, invoices: [] },
      "90+ Days": { range: "90+ Days", count: 0, amount: 0, invoices: [] },
    };

    let totalOutstanding = 0;

    invoices.forEach((inv) => {
      const diffTime = Math.abs(now.getTime() - new Date(inv.date).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let bKey = "0-30 Days";
      if (diffDays > 90) bKey = "90+ Days";
      else if (diffDays > 60) bKey = "61-90 Days";
      else if (diffDays > 30) bKey = "31-60 Days";

      buckets[bKey].count += 1;
      buckets[bKey].amount += inv.balance;
      buckets[bKey].invoices.push(inv);
      totalOutstanding += inv.balance;
    });

    return {
      reportType: "Outstanding Aging",
      totalOutstanding,
      totalPendingInvoices: invoices.length,
      buckets: Object.values(buckets),
      invoices,
    };
  }

  // ─── ADVANCE DEPOSIT & REFUND SUMMARY REPORT ─────────────────────────────────
  static async getRefundsCreditReport() {
    const [advances, creditNotes, refunds] = await prisma.$transaction([
      prisma.advanceCollection.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.creditNote.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.refundRecord.findMany({ orderBy: { createdAt: "desc" } }),
    ]);

    const totalAdvanceBalance = advances
      .filter((a) => a.status === "Active")
      .reduce((s, a) => s + a.balanceAmount, 0);
    const totalCreditNotes = creditNotes.reduce((s, c) => s + c.amount, 0);
    const totalRefunds = refunds.reduce((s, r) => s + r.amount, 0);

    return {
      reportType: "Advance & Refund Summary",
      summary: {
        totalAdvanceBalance,
        totalCreditNotes,
        totalRefunds,
      },
      advances,
      creditNotes,
      refunds,
    };
  }
}
