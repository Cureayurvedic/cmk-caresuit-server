import { AtdService } from "./atd.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export class AtdController {
  static listBeds = asyncHandler(async (req, res) => {
    const data = await AtdService.listBeds(req.query);
    res.status(200).json({
      success: true,
      message: "Beds retrieved successfully",
      data,
    });
  });

  static admitPatient = asyncHandler(async (req, res) => {
    const bed = await AtdService.admitPatient(req.body);
    res.status(200).json({
      success: true,
      message: `Patient successfully admitted to bed ${bed.bedNo}`,
      data: bed,
    });
  });

  static transferPatient = asyncHandler(async (req, res) => {
    const result = await AtdService.transferPatient(req.body);
    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  });

  static initiateDischarge = asyncHandler(async (req, res) => {
    const bed = await AtdService.initiateDischarge(req.body);
    res.status(200).json({
      success: true,
      message: `Discharge initiated for bed ${bed.bedNo}`,
      data: bed,
    });
  });

  static completeDischarge = asyncHandler(async (req, res) => {
    const bed = await AtdService.completeDischarge(req.body);
    res.status(200).json({
      success: true,
      message: `Discharge completed. Bed ${bed.bedNo} moved to House Keeping.`,
      data: bed,
    });
  });

  static updateBedStatus = asyncHandler(async (req, res) => {
    const bed = await AtdService.updateBedStatus(req.body);
    res.status(200).json({
      success: true,
      message: `Bed ${bed.bedNo} status updated to ${bed.status}`,
      data: bed,
    });
  });
}
