import {
  Router,
} from "express";

import {
  createProject,
  deleteProject,
  getProject,
  getProjects,
  updateProject,
} from "../controllers/project.controller.js";

import {
  addProjectMembers,
  getProjectMembers,
  removeProjectMember,
} from "../controllers/project-member.controller.js";

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
  asyncHandler,
} from "../utils/asyncHandler.js";

/*
 * mergeParams is required because
 * workspaceId is supplied by the
 * parent route:
 *
 * /api/workspaces/:workspaceId/projects
 */
const router =
  Router({
    mergeParams: true,
  });

/*
|--------------------------------------------------------------------------
| ALL PROJECT ROUTES
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

/*
|--------------------------------------------------------------------------
| CREATE PROJECT
|--------------------------------------------------------------------------
|
| OWNER / MANAGER
|
*/

router.post(
  "/",

  requireWorkspaceRole(
    "OWNER",
    "MANAGER"
  ),

  asyncHandler(
    createProject
  )
);

/*
|--------------------------------------------------------------------------
| LIST PROJECTS
|--------------------------------------------------------------------------
*/

router.get(
  "/",

  asyncHandler(
    getProjects
  )
);

/*
|--------------------------------------------------------------------------
| PROJECT MEMBERS
|--------------------------------------------------------------------------
*/

router.get(
  "/:projectId/members",

  asyncHandler(
    requireProjectAccess
  ),

  asyncHandler(
    getProjectMembers
  )
);

router.post(
  "/:projectId/members",

  asyncHandler(
    requireProjectAccess
  ),

  requireWorkspaceRole(
    "OWNER",
    "MANAGER"
  ),

  asyncHandler(
    addProjectMembers
  )
);

router.delete(
  "/:projectId/members/:userId",

  asyncHandler(
    requireProjectAccess
  ),

  requireWorkspaceRole(
    "OWNER",
    "MANAGER"
  ),

  asyncHandler(
    removeProjectMember
  )
);

/*
|--------------------------------------------------------------------------
| GET PROJECT
|--------------------------------------------------------------------------
*/

router.get(
  "/:projectId",

  asyncHandler(
    requireProjectAccess
  ),

  asyncHandler(
    getProject
  )
);

/*
|--------------------------------------------------------------------------
| UPDATE PROJECT
|--------------------------------------------------------------------------
|
| OWNER / MANAGER
|
*/

router.patch(
  "/:projectId",

  asyncHandler(
    requireProjectAccess
  ),

  requireWorkspaceRole(
    "OWNER",
    "MANAGER"
  ),

  asyncHandler(
    updateProject
  )
);

/*
|--------------------------------------------------------------------------
| DELETE PROJECT
|--------------------------------------------------------------------------
|
| OWNER ONLY
|
*/

router.delete(
  "/:projectId",

  asyncHandler(
    requireProjectAccess
  ),

  requireWorkspaceRole(
    "OWNER"
  ),

  asyncHandler(
    deleteProject
  )
);

export default router;