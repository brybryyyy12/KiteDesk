import {
  Router,
} from "express";

import {
  login,
  logout,
  me,
  register,
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