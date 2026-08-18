import { BedCategoryService } from "./bedCategory.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export class BedCategoryController {
  /**
   * GET /api/v1/settings/bed-categories
   * Returns all bed categories with live bed counts.
   */
  static list = asyncHandler(async (_req, res) => {
    const result = await BedCategoryService.listCategories();
    res.status(200).json({
      success: true,
      message: "Bed categories retrieved successfully",
      data: result,
    });
  });

  /**
   * POST /api/v1/settings/bed-categories
   * Body: { name, prefix, ward, tariffRate, totalBeds }
   * Creates a new bed category and auto-generates beds.
   */
  static create = asyncHandler(async (req, res) => {
    const category = await BedCategoryService.createCategory(req.body);
    res.status(201).json({
      success: true,
      message: `Bed category "${category.name}" created with ${category.totalBeds} beds`,
      data: { category },
    });
  });

  /**
   * PATCH /api/v1/settings/bed-categories/:id
   * Body: { name?, ward?, tariffRate?, totalBeds? }
   * Updates category details and adjusts bed count.
   */
  static update = asyncHandler(async (req, res) => {
    const category = await BedCategoryService.updateCategory(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: `Bed category "${category.name}" updated successfully`,
      data: { category },
    });
  });

  /**
   * DELETE /api/v1/settings/bed-categories/:id
   * Deletes the category and all its beds (if none are occupied).
   */
  static delete = asyncHandler(async (req, res) => {
    const deleted = await BedCategoryService.deleteCategory(req.params.id);
    res.status(200).json({
      success: true,
      message: `Bed category "${deleted.name}" deleted successfully`,
      data: { deleted: true, id: req.params.id },
    });
  });
}

export default BedCategoryController;
