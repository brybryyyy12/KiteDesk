import {
  Router,
} from "express";

import {
  acceptInvitation,
  declineInvitation,
  getInvitation,
} from "../controllers/invitation.controller.js";

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
| INVITATION ROUTES
|--------------------------------------------------------------------------
|
| GET /:token
|
| Public.
|
| A user needs to be able to view an
| invitation before they have a
| KiteDesk account.
|
| The invitation token is a long,
| cryptographically random secret.
|
|
| POST /:token/accept
| POST /:token/decline
|
| Protected.
|
| The user must be authenticated and
| the controller verifies that their
| email matches the invitation email.
|
*/

/*
|--------------------------------------------------------------------------
| VIEW INVITATION
|--------------------------------------------------------------------------
|
| No requireAuth here.
|
| This allows:
|
| Invitation link
| → view workspace information
| → Login OR Register
|
*/

router.get(
  "/:token",
  asyncHandler(
    getInvitation
  )
);

/*
|--------------------------------------------------------------------------
| ACCEPT INVITATION
|--------------------------------------------------------------------------
*/

router.post(
  "/:token/accept",
  requireAuth,
  asyncHandler(
    acceptInvitation
  )
);

/*
|--------------------------------------------------------------------------
| DECLINE INVITATION
|--------------------------------------------------------------------------
*/

router.post(
  "/:token/decline",
  requireAuth,
  asyncHandler(
    declineInvitation
  )
);

export default router;