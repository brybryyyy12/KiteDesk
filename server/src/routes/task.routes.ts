import {
  Router,
} from "express";

import {
  createTask,
  deleteTask,
  getTask,
  getTasks,
  updateTask,
  updateTaskStatus,
} from "../controllers/task.controller.js";

import {
  createTaskComment,
  getTaskComments,
} from "../controllers/comment.controller.js";

import {
  downloadTaskAttachment,
  getTaskAttachments,
  uploadTaskAttachment,
} from "../controllers/attachment.controller.js";

import {
  requireAuth,
} from "../middleware/auth.middleware.js";

import {
  requireWorkspaceMembership,
  requireWorkspaceRole,
} from "../middleware/workspace.middleware.js";

import {
  requireProjectAccess,
} from "../middleware/project.middleware.js";

import {
  requireTask,
} from "../middleware/task.middleware.js";

import {
  taskUpload,
} from "../middleware/upload.middleware.js";

import {
  asyncHandler,
} from "../utils/asyncHandler.js";
import { createChecklistItem, createSubtask, deleteChecklistItem, updateChecklistItem } from "../controllers/task-structure.controller.js";

const router =
  Router({
    mergeParams: true,
  });

/*
|--------------------------------------------------------------------------
| ALL TASK ROUTES
|--------------------------------------------------------------------------
*/

router.use(
  requireAuth
);

router.use(
  asyncHandler(
    requireWorkspaceMembership
  )
);

router.use(
  asyncHandler(
    requireProjectAccess
  )
);

/*
|--------------------------------------------------------------------------
| CREATE TASK
|--------------------------------------------------------------------------
*/

router.post(
  "/",

  requireWorkspaceRole(
    "OWNER",
    "MANAGER"
  ),

  asyncHandler(
    createTask
  )
);

/*
|--------------------------------------------------------------------------
| LIST TASKS
|--------------------------------------------------------------------------
*/

router.get(
  "/",

  asyncHandler(
    getTasks
  )
);

/*
|--------------------------------------------------------------------------
| COMMENTS
|--------------------------------------------------------------------------
*/

router.get(
  "/:taskId/comments",

  asyncHandler(
    requireTask
  ),

  asyncHandler(
    getTaskComments
  )
);

router.post(
  "/:taskId/comments",

  asyncHandler(
    requireTask
  ),

  asyncHandler(
    createTaskComment
  )
);

router.post("/:taskId/subtasks", asyncHandler(requireTask), requireWorkspaceRole("OWNER", "MANAGER"), asyncHandler(createSubtask));
router.post("/:taskId/checklist", asyncHandler(requireTask), asyncHandler(createChecklistItem));
router.patch("/:taskId/checklist/:checklistItemId", asyncHandler(requireTask), asyncHandler(updateChecklistItem));
router.delete("/:taskId/checklist/:checklistItemId", asyncHandler(requireTask), asyncHandler(deleteChecklistItem));

/*
|--------------------------------------------------------------------------
| ATTACHMENTS
|--------------------------------------------------------------------------
*/

router.get(
  "/:taskId/attachments",

  asyncHandler(
    requireTask
  ),

  asyncHandler(
    getTaskAttachments
  )
);

router.post(
  "/:taskId/attachments",

  asyncHandler(
    requireTask
  ),

  taskUpload.single(
    "file"
  ),

  asyncHandler(
    uploadTaskAttachment
  )
);

/*
|--------------------------------------------------------------------------
| DOWNLOAD ATTACHMENT
|--------------------------------------------------------------------------
*/

router.get(
  "/:taskId/attachments/:attachmentId/file",

  asyncHandler(
    requireTask
  ),

  asyncHandler(
    downloadTaskAttachment
  )
);

/*
|--------------------------------------------------------------------------
| GET ONE TASK
|--------------------------------------------------------------------------
*/

router.get(
  "/:taskId",

  asyncHandler(
    requireTask
  ),

  asyncHandler(
    getTask
  )
);

/*
|--------------------------------------------------------------------------
| UPDATE TASK
|--------------------------------------------------------------------------
*/

router.patch(
  "/:taskId",

  asyncHandler(
    requireTask
  ),

  requireWorkspaceRole(
    "OWNER",
    "MANAGER"
  ),

  asyncHandler(
    updateTask
  )
);

/*
|--------------------------------------------------------------------------
| STATUS
|--------------------------------------------------------------------------
*/

router.patch(
  "/:taskId/status",

  asyncHandler(
    requireTask
  ),

  asyncHandler(
    updateTaskStatus
  )
);

/*
|--------------------------------------------------------------------------
| DELETE
|--------------------------------------------------------------------------
*/

router.delete(
  "/:taskId",

  asyncHandler(
    requireTask
  ),

  requireWorkspaceRole(
    "OWNER",
    "MANAGER"
  ),

  asyncHandler(
    deleteTask
  )
);

export default router;
