import { SettingsService } from "./settings.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export class SettingsController {
  /**
   * GET /api/v1/settings/:category
   * Returns all master options for the given category.
   */
  static list = asyncHandler(async (req, res) => {
    const { category } = req.params;
    const result = await SettingsService.listItems(category);

    res.status(200).json({
      success: true,
      message: `Settings for "${category}" retrieved successfully`,
      data: result,
    });
  });

  /**
   * POST /api/v1/settings/:category
   * Body: { value: string }
   * Adds a new item to the category.
   */
  static create = asyncHandler(async (req, res) => {
    const { category } = req.params;
    const { value } = req.body;
    const item = await SettingsService.addItem(category, value);

    res.status(201).json({
      success: true,
      message: `"${item.value}" added to ${category} successfully`,
      data: { item },
    });
  });

  /**
   * DELETE /api/v1/settings/:category/:id
   * Removes an item by its id.
   */
  static delete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await SettingsService.deleteItem(id);

    res.status(200).json({
      success: true,
      message: "Option deleted successfully",
      data: result,
    });
  });
}

export default SettingsController;
