import { BillingService } from "./billing.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export class BillingController {
  // Stats
  static getStats = asyncHandler(async (_req, res) => {
    const data = await BillingService.getStats();
    res.status(200).json({
      success: true,
      message: "Billing stats retrieved successfully",
      data,
    });
  });

  // Invoices
  static list = asyncHandler(async (req, res) => {
    const result = await BillingService.listInvoices(req.query);
    res.status(200).json({
      success: true,
      message: "Invoices list retrieved successfully",
      data: result,
    });
  });

  // Receipts / Cashbook Ledger
  static listReceipts = asyncHandler(async (req, res) => {
    const result = await BillingService.listReceipts(req.query);
    res.status(200).json({
      success: true,
      message: "Receipts list retrieved successfully",
      data: result,
    });
  });

  // Patients for Census / Lookup
  static listPatients = asyncHandler(async (req, res) => {
    const patients = await BillingService.listPatients(req.query);
    res.status(200).json({
      success: true,
      message: "Billing patients retrieved successfully",
      data: { patients },
    });
  });

  static getById = asyncHandler(async (req, res) => {
    const invoice = await BillingService.getInvoiceById(req.params.id);
    res.status(200).json({
      success: true,
      message: "Invoice retrieved successfully",
      data: { invoice },
    });
  });

  static create = asyncHandler(async (req, res) => {
    const invoice = await BillingService.createInvoice(req.body);
    res.status(201).json({
      success: true,
      message: "Invoice created successfully",
      data: { invoice },
    });
  });

  static settle = asyncHandler(async (req, res) => {
    const invoice = await BillingService.settleInvoice(req.body);
    res.status(200).json({
      success: true,
      message: "Invoice payment/settlement processed successfully",
      data: { invoice },
    });
  });

  static cancel = asyncHandler(async (req, res) => {
    const invoice = await BillingService.cancelInvoice(req.params.id);
    res.status(200).json({
      success: true,
      message: "Invoice cancelled successfully",
      data: { invoice },
    });
  });

  // OP Visits
  static listVisits = asyncHandler(async (req, res) => {
    const visits = await BillingService.listVisits(req.query);
    res.status(200).json({
      success: true,
      message: "OP visits retrieved successfully",
      data: { visits },
    });
  });

  static createVisit = asyncHandler(async (req, res) => {
    const visit = await BillingService.createVisit(req.body);
    res.status(201).json({
      success: true,
      message: "OP visit created successfully",
      data: { visit },
    });
  });

  // Billing Orders
  static listOrders = asyncHandler(async (req, res) => {
    const orders = await BillingService.listOrders(req.query);
    res.status(200).json({
      success: true,
      message: "Billing orders retrieved successfully",
      data: { orders },
    });
  });

  static createOrder = asyncHandler(async (req, res) => {
    const order = await BillingService.createOrder(req.body);
    res.status(201).json({
      success: true,
      message: "Billing order created successfully",
      data: { order },
    });
  });

  static billOrder = asyncHandler(async (req, res) => {
    const invoice = await BillingService.billOrder(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: "Billing order converted to invoice successfully",
      data: { invoice },
    });
  });

  // Advance Collections
  static listAdvances = asyncHandler(async (req, res) => {
    const advances = await BillingService.listAdvances(req.query);
    res.status(200).json({
      success: true,
      message: "Advance collections retrieved successfully",
      data: { advances },
    });
  });

  static createAdvance = asyncHandler(async (req, res) => {
    const advance = await BillingService.createAdvance(req.body);
    res.status(201).json({
      success: true,
      message: "Advance collection saved successfully",
      data: { advance },
    });
  });

  // Credit Notes
  static listCreditNotes = asyncHandler(async (req, res) => {
    const creditNotes = await BillingService.listCreditNotes(req.query);
    res.status(200).json({
      success: true,
      message: "Credit notes retrieved successfully",
      data: { creditNotes },
    });
  });

  static createCreditNote = asyncHandler(async (req, res) => {
    const creditNote = await BillingService.createCreditNote(req.body);
    res.status(201).json({
      success: true,
      message: "Credit note issued successfully",
      data: { creditNote },
    });
  });

  // Refunds
  static listRefunds = asyncHandler(async (req, res) => {
    const refunds = await BillingService.listRefunds(req.query);
    res.status(200).json({
      success: true,
      message: "Refund records retrieved successfully",
      data: { refunds },
    });
  });

  static createRefund = asyncHandler(async (req, res) => {
    const refund = await BillingService.createRefund(req.body);
    res.status(201).json({
      success: true,
      message: "Refund processed successfully",
      data: { refund },
    });
  });

  // Insurance Intimations
  static listIntimations = asyncHandler(async (req, res) => {
    const intimations = await BillingService.listIntimations(req.query);
    res.status(200).json({
      success: true,
      message: "Insurance intimations retrieved successfully",
      data: { intimations },
    });
  });

  static createIntimation = asyncHandler(async (req, res) => {
    const intimation = await BillingService.createIntimation(req.body);
    res.status(201).json({
      success: true,
      message: "Insurance intimation created successfully",
      data: { intimation },
    });
  });

  static updateIntimation = asyncHandler(async (req, res) => {
    const intimation = await BillingService.updateIntimation(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: "Insurance intimation updated successfully",
      data: { intimation },
    });
  });

  // Seeding
  static seed = asyncHandler(async (_req, res) => {
    const result = await BillingService.seedDemoBillingData();
    res.status(200).json({
      success: true,
      message: "Demo billing seeding process completed",
      data: result,
    });
  });
}

export default BillingController;
