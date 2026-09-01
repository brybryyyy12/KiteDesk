import {
  Router,
} from "express";

import {
  forgotPassword,
  login,
  logout,
  me,
  register,
  resendVerificationEmail,
  resetPassword,
  verifyEmail,
} from "../controllers/auth.controller.js";

import {
  requireAuth,
} from "../middleware/auth.middleware.js";

import {
  asyncHandler,
} from "../utils/asyncHandler.js";

const router =
  Router();

/*
|--------------------------------------------------------------------------
| PUBLIC AUTH ROUTES
|--------------------------------------------------------------------------
*/

router.post(
  "/register",
  asyncHandler(register)
);

router.post(
  "/login",
  asyncHandler(login)
);

router.post(
  "/verify-email",
  asyncHandler(verifyEmail)
);

router.post(
  "/resend-verification",
  asyncHandler(
    resendVerificationEmail
  )
);

router.post(
  "/forgot-password",
  asyncHandler(
    forgotPassword
  )
);

router.post(
  "/reset-password",
  asyncHandler(
    resetPassword
  )
);

/*
|--------------------------------------------------------------------------
| PROTECTED AUTH ROUTES
|--------------------------------------------------------------------------
*/

router.get(
  "/me",
  requireAuth,
  asyncHandler(me)
);

router.post(
  "/logout",
  asyncHandler(logout)
);

export default router;
