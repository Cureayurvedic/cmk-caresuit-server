import { ReportsService } from "./reports.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export class ReportsController {
  static getRevenueReport = asyncHandler(async (req, res) => {
    const report = await ReportsService.getRevenueReport(req.query);
    res.status(200).json({
      success: true,
      message: "Revenue report generated successfully",
      data: report,
    });
  });

  static getCollectionsReport = asyncHandler(async (req, res) => {
    const report = await ReportsService.getCollectionsReport(req.query);
    res.status(200).json({
      success: true,
      message: "Collections report generated successfully",
      data: report,
    });
  });

  static getBillRegisterReport = asyncHandler(async (req, res) => {
    const report = await ReportsService.getBillRegisterReport(req.query);
    res.status(200).json({
      success: true,
      message: "Bill register report generated successfully",
      data: report,
    });
  });

  static getAtdCensusReport = asyncHandler(async (req, res) => {
    const report = await ReportsService.getAtdCensusReport(req.query);
    res.status(200).json({
      success: true,
      message: "ATD census report generated successfully",
      data: report,
    });
  });

  static getOutstandingReport = asyncHandler(async (req, res) => {
    const report = await ReportsService.getOutstandingReport(req.query);
    res.status(200).json({
      success: true,
      message: "Outstanding aging report generated successfully",
      data: report,
    });
  });

  static getRefundsCreditReport = asyncHandler(async (_req, res) => {
    const report = await ReportsService.getRefundsCreditReport();
    res.status(200).json({
      success: true,
      message: "Advance & refund summary report generated successfully",
      data: report,
    });
  });
}
