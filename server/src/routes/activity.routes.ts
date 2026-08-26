import {
  Router,
} from "express";

import {
  getWorkspaceActivity,
} from "../controllers/activity.controller.js";

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
| AUTH
|--------------------------------------------------------------------------
*/

router.use(
  requireAuth
);

/*
|--------------------------------------------------------------------------
| WORKSPACE ACTIVITY
|--------------------------------------------------------------------------
*/

router.get(
  "/:workspaceId/activity",
  asyncHandler(
    getWorkspaceActivity
  )
);

export default router;