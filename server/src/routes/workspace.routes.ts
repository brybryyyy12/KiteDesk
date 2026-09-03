import {
  Router,
} from "express";

import {
  createWorkspace,
  getMyWorkspaces,
  getWorkspace,
  updateWorkspace,
} from "../controllers/workspace.controller.js";

import {
  createInvitation,
  getWorkspaceInvitations,
  revokeInvitation,
} from "../controllers/invitation.controller.js";

import {
  getWorkspaceMembers,
  leaveWorkspace,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
} from "../controllers/workspace-member.controller.js";

import {
  searchWorkspace,
} from "../controllers/search.controller.js";

import {
  requireAuth,
} from "../middleware/auth.middleware.js";

import {
  requireWorkspaceMembership,
  requireWorkspaceRole,
} from "../middleware/workspace.middleware.js";

import {
  asyncHandler,
} from "../utils/asyncHandler.js";

const router =
  Router();

/*
|--------------------------------------------------------------------------
| ALL WORKSPACE ROUTES REQUIRE LOGIN
|--------------------------------------------------------------------------
*/

router.use(
  requireAuth
);

/*
|--------------------------------------------------------------------------
| CREATE / LIST
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  asyncHandler(
    createWorkspace
  )
);

router.get(
  "/",
  asyncHandler(
    getMyWorkspaces
  )
);

/*
|--------------------------------------------------------------------------
| MEMBERS
|--------------------------------------------------------------------------
*/

router.get(
  "/:workspaceId/members",

  asyncHandler(
    requireWorkspaceMembership
  ),

  asyncHandler(
    getWorkspaceMembers
  )
);

/*
|--------------------------------------------------------------------------
| LEAVE WORKSPACE
|--------------------------------------------------------------------------
|
| Must appear before
| /members/:membershipId
| so "me" is not interpreted as an ID.
|
*/

router.delete(
  "/:workspaceId/members/me",

  asyncHandler(
    requireWorkspaceMembership
  ),

  asyncHandler(
    leaveWorkspace
  )
);

/*
|--------------------------------------------------------------------------
| CHANGE MEMBER ROLE
|--------------------------------------------------------------------------
|
| OWNER only.
|
*/

router.patch(
  "/:workspaceId/members/:membershipId/role",

  asyncHandler(
    requireWorkspaceMembership
  ),

  requireWorkspaceRole(
    "OWNER"
  ),

  asyncHandler(
    updateWorkspaceMemberRole
  )
);

/*
|--------------------------------------------------------------------------
| REMOVE MEMBER
|--------------------------------------------------------------------------
|
| OWNER:
| can remove members according to
| last-owner rules.
|
| MANAGER:
| can remove MEMBER only.
|
*/

router.delete(
  "/:workspaceId/members/:membershipId",

  asyncHandler(
    requireWorkspaceMembership
  ),

  requireWorkspaceRole(
    "OWNER",
    "MANAGER"
  ),

  asyncHandler(
    removeWorkspaceMember
  )
);

/*
|--------------------------------------------------------------------------
| INVITATIONS
|--------------------------------------------------------------------------
*/

router.post(
  "/:workspaceId/invitations",

  asyncHandler(
    requireWorkspaceMembership
  ),

  requireWorkspaceRole(
    "OWNER",
    "MANAGER"
  ),

  asyncHandler(
    createInvitation
  )
);

router.get(
  "/:workspaceId/invitations",

  asyncHandler(
    requireWorkspaceMembership
  ),

  requireWorkspaceRole(
    "OWNER",
    "MANAGER"
  ),

  asyncHandler(
    getWorkspaceInvitations
  )
);

router.delete(
  "/:workspaceId/invitations/:invitationId",

  asyncHandler(
    requireWorkspaceMembership
  ),

  requireWorkspaceRole(
    "OWNER",
    "MANAGER"
  ),

  asyncHandler(
    revokeInvitation
  )
);

/*
|--------------------------------------------------------------------------
| GLOBAL SEARCH
|--------------------------------------------------------------------------
*/

router.get(
  "/:workspaceId/search",

  asyncHandler(
    requireWorkspaceMembership
  ),

  asyncHandler(
    searchWorkspace
  )
);

/*
|--------------------------------------------------------------------------
| WORKSPACE DETAILS
|--------------------------------------------------------------------------
*/

router.get(
  "/:workspaceId",

  asyncHandler(
    requireWorkspaceMembership
  ),

  asyncHandler(
    getWorkspace
  )
);

/*
|--------------------------------------------------------------------------
| UPDATE WORKSPACE
|--------------------------------------------------------------------------
*/

router.patch(
  "/:workspaceId",

  asyncHandler(
    requireWorkspaceMembership
  ),

  requireWorkspaceRole(
    "OWNER",
    "MANAGER"
  ),

  asyncHandler(
    updateWorkspace
  )
);

export default router;
