import { BillingService } from "./billing.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export class BillingController {
  static list = asyncHandler(async (req, res) => {
    const result = await BillingService.listInvoices(req.query);

    res.status(200).json({
      success: true,
      message: "Invoices list retrieved successfully",
      data: result,
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

  static seed = asyncHandler(async (req, res) => {
    const result = await BillingService.seedDemoInvoices();

    res.status(200).json({
      success: true,
      message: "Demo invoices seeding process completed",
      data: result,
    });
  });
}

export default BillingController;
