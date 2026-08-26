import {
  Router,
} from "express";

import {
  clearNotifications,
  deleteNotification,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  updateNotificationReadStatus,
} from "../controllers/notification.controller.js";

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
| ALL NOTIFICATION ROUTES REQUIRE LOGIN
|--------------------------------------------------------------------------
*/

router.use(
  requireAuth
);

/*
|--------------------------------------------------------------------------
| LIST
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  asyncHandler(
    getNotifications
  )
);

/*
|--------------------------------------------------------------------------
| UNREAD COUNT
|--------------------------------------------------------------------------
*/

router.get(
  "/unread-count",
  asyncHandler(
    getUnreadNotificationCount
  )
);

/*
|--------------------------------------------------------------------------
| MARK ALL READ
|--------------------------------------------------------------------------
*/

router.patch(
  "/read-all",
  asyncHandler(
    markAllNotificationsRead
  )
);

/*
|--------------------------------------------------------------------------
| READ / UNREAD
|--------------------------------------------------------------------------
*/

router.patch(
  "/:notificationId/read",
  asyncHandler(
    updateNotificationReadStatus
  )
);

/*
|--------------------------------------------------------------------------
| DELETE ONE
|--------------------------------------------------------------------------
*/

router.delete(
  "/:notificationId",
  asyncHandler(
    deleteNotification
  )
);

/*
|--------------------------------------------------------------------------
| CLEAR ALL
|--------------------------------------------------------------------------
*/

router.delete(
  "/",
  asyncHandler(
    clearNotifications
  )
);

export default router;