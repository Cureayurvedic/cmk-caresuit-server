import { UsersService } from "./users.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export class UsersController {
  static getAllUsers = asyncHandler(async (req, res) => {
    const users = await UsersService.getAllUsers();
    res.status(200).json(users);
  });

  static getUserById = asyncHandler(async (req, res) => {
    const user = await UsersService.getUserById(req.params.id);
    res.status(200).json(user);
  });

  static createUser = asyncHandler(async (req, res) => {
    const user = await UsersService.createUser(req.body);
    res.status(201).json(user);
  });

  static updateUser = asyncHandler(async (req, res) => {
    const user = await UsersService.updateUser(req.params.id, req.body);
    res.status(200).json(user);
  });

  static deleteUser = asyncHandler(async (req, res) => {
    await UsersService.deleteUser(req.params.id);
    res.status(200).json({ success: true, message: "User deleted successfully" });
  });
}
