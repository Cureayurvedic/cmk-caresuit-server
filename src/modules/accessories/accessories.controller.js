import { AccessoriesService } from "./accessories.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export class AccessoriesController {
  /**
   * @route   GET /api/v1/accessories
   * @desc    Get all accessories with optional filters
   * @access  Private (Admin, Operator)
   */
  static list = asyncHandler(async (req, res) => {
    const result = await AccessoriesService.getAllAccessories(req.query);

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  /**
   * @route   GET /api/v1/accessories/:id
   * @desc    Get single accessory by ID
   * @access  Private (Admin, Operator)
   */
  static get = asyncHandler(async (req, res) => {
    const accessory = await AccessoriesService.getAccessoryById(req.params.id);

    res.status(200).json({
      success: true,
      data: { accessory },
    });
  });

  /**
   * @route   POST /api/v1/accessories
   * @desc    Create new accessory
   * @access  Private (Admin, Operator)
   */
  static create = asyncHandler(async (req, res) => {
    const accessory = await AccessoriesService.createAccessory(req.body);

    res.status(201).json({
      success: true,
      message: "Accessory created successfully",
      data: { accessory },
    });
  });

  /**
   * @route   PUT /api/v1/accessories/:id
   * @desc    Update accessory
   * @access  Private (Admin, Operator)
   */
  static update = asyncHandler(async (req, res) => {
    const accessory = await AccessoriesService.updateAccessory(req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: "Accessory updated successfully",
      data: { accessory },
    });
  });

  /**
   * @route   DELETE /api/v1/accessories/:id
   * @desc    Delete accessory
   * @access  Private (Admin)
   */
  static delete = asyncHandler(async (req, res) => {
    await AccessoriesService.deleteAccessory(req.params.id);

    res.status(200).json({
      success: true,
      message: "Accessory deleted successfully",
    });
  });

  /**
   * @route   PATCH /api/v1/accessories/:id/stock
   * @desc    Adjust stock for specific size
   * @access  Private (Admin, Operator)
   */
  static adjustStock = asyncHandler(async (req, res) => {
    const { size, delta } = req.body;
    const accessory = await AccessoriesService.adjustStock(req.params.id, size, delta);

    res.status(200).json({
      success: true,
      message: `Stock adjusted for size ${size}`,
      data: { accessory },
    });
  });

  /**
   * @route   POST /api/v1/accessories/import
   * @desc    Bulk import accessories
   * @access  Private (Admin, Operator)
   */
  static importBulk = asyncHandler(async (req, res) => {
    const { accessories } = req.body;

    if (!Array.isArray(accessories) || accessories.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of accessories to import",
      });
    }

    const result = await AccessoriesService.importAccessories(accessories);

    res.status(200).json({
      success: true,
      message: "Bulk import completed",
      data: result,
    });
  });
}
