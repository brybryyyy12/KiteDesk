import {
  Router,
} from "express";

import {
  changePassword,
  getNotificationPreferences,
  getProfileSettings,
  updateNotificationPreferences,
  updateProfileSettings,
} from "../controllers/settings.controller.js";

import {
  requireAuth,
} from "../middleware/auth.middleware.js";

import {
  asyncHandler,
} from "../utils/asyncHandler.js";

const router =
  Router();

router.use(
  requireAuth
);

/*
|--------------------------------------------------------------------------
| PROFILE
|--------------------------------------------------------------------------
*/

router.get(
  "/profile",
  asyncHandler(
    getProfileSettings
  )
);

router.patch(
  "/profile",
  asyncHandler(
    updateProfileSettings
  )
);

/*
|--------------------------------------------------------------------------
| PASSWORD
|--------------------------------------------------------------------------
*/

router.patch(
  "/password",
  asyncHandler(
    changePassword
  )
);

/*
|--------------------------------------------------------------------------
| NOTIFICATION SETTINGS
|--------------------------------------------------------------------------
*/

router.get(
  "/notifications",
  asyncHandler(
    getNotificationPreferences
  )
);

router.patch(
  "/notifications",
  asyncHandler(
    updateNotificationPreferences
  )
);

export default router;