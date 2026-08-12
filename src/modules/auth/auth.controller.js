import { AuthService } from "./auth.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export class AuthController {
  static register = asyncHandler(async (req, res) => {
    const result = await AuthService.registerUser(req.body);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: result.user,
        token: result.token,
      },
    });
  });

  static login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await AuthService.loginUser(email, password);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: result.user,
        token: result.token,
      },
    });
  });

  static getMe = asyncHandler(async (req, res) => {
    res.status(200).json({
      success: true,
      message: "User profile retrieved successfully",
      data: {
        user: req.user,
      },
    });
  });
}

export default AuthController;
