import { Router } from "express";
import { UsersController } from "./users.controller.js";
import { createUserSchema, updateUserSchema } from "./users.validator.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { protect, authorize } from "../../middlewares/auth.middleware.js";

const router = Router();

// Protect all routes
router.use(protect);
// Restrict all routes to Admin only
router.use(authorize("Admin"));

router
  .route("/")
  .get(UsersController.getAllUsers)
  .post(validate(createUserSchema), UsersController.createUser);

router
  .route("/:id")
  .get(UsersController.getUserById)
  .put(validate(updateUserSchema), UsersController.updateUser)
  .delete(UsersController.deleteUser);

export default router;
