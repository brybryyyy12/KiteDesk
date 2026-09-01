import {
  env,
} from "../config/env.js";

import {
  AppError,
} from "../utils/AppError.js";

/*
|--------------------------------------------------------------------------
| BREVO API
|--------------------------------------------------------------------------
|
| KiteDesk sends transactional email through
| Brevo's HTTPS API instead of SMTP.
|
| This works on Render Free because it does
| not require outbound SMTP ports.
|
*/

const BREVO_SEND_EMAIL_URL =
  "https://api.brevo.com/v3/smtp/email";

/*
|--------------------------------------------------------------------------
| HTML ESCAPING
|--------------------------------------------------------------------------
*/

function escapeHtml(
  value: string
) {
  return value
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}

type BrevoErrorBody = {
  code?: string;
  message?: string;
};

type SendTransactionalEmailInput = {
  to: string;
  subject: string;
  htmlContent: string;
  errorMessage: string;
  errorCode: string;
};

async function sendTransactionalEmail(
  input:
    SendTransactionalEmailInput
) {
  try {
    const response =
      await fetch(
        BREVO_SEND_EMAIL_URL,
        {
          method:
            "POST",

          headers: {
            accept:
              "application/json",

            "content-type":
              "application/json",

            "api-key":
              env.BREVO_API_KEY,
          },

          body:
            JSON.stringify({
              sender: {
                name:
                  env.BREVO_SENDER_NAME,

                email:
                  env.BREVO_SENDER_EMAIL,
              },

              to: [
                {
                  email:
                    input.to,
                },
              ],

              subject:
                input.subject,

              htmlContent:
                input.htmlContent,
            }),
        }
      );

    if (
      !response.ok
    ) {
      let brevoError:
        BrevoErrorBody | null =
          null;

      try {
        brevoError =
          (await response.json()) as
            BrevoErrorBody;
      } catch {
        brevoError =
          null;
      }

      console.error(
        "Brevo email request failed:",
        {
          status:
            response.status,

          code:
            brevoError?.code,

          message:
            brevoError?.message,
        }
      );

      throw new AppError(
        input.errorMessage,
        502,
        input.errorCode
      );
    }

    return await response.json();
  } catch (error) {
    if (
      error instanceof
      AppError
    ) {
      throw error;
    }

    console.error(
      "Brevo email request failed:",
      error
    );

    throw new AppError(
      input.errorMessage,
      502,
      input.errorCode
    );
  }
}

/*
|--------------------------------------------------------------------------
| EMAIL VERIFICATION
|--------------------------------------------------------------------------
*/

type SendEmailVerificationInput =
  {
    to: string;

    name: string;

    verificationUrl: string;

    expiresAt: Date;
  };

export async function sendEmailVerificationEmail(
  input:
    SendEmailVerificationInput
) {
  const name =
    escapeHtml(
      input.name
    );

  const verificationUrl =
    escapeHtml(
      input.verificationUrl
    );

  const expiration =
    input.expiresAt.toLocaleString(
      "en-US",
      {
        month:
          "long",

        day:
          "numeric",

        year:
          "numeric",

        hour:
          "numeric",

        minute:
          "2-digit",

        timeZoneName:
          "short",
      }
    );

  return sendTransactionalEmail({
    to:
      input.to,

    subject:
      "Verify your email address for KiteDesk",

    errorMessage:
      "The verification email could not be sent.",

    errorCode:
      "VERIFICATION_EMAIL_FAILED",

    htmlContent: `
      <!doctype html>
      <html>
        <body style="
          margin:0;
          padding:0;
          background:#f7f5f1;
          font-family:Inter,Arial,sans-serif;
          color:#2e3338;
        ">
          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            role="presentation"
            style="
              padding:40px 16px;
              background:#f7f5f1;
            "
          >
            <tr>
              <td align="center">
                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  role="presentation"
                  style="
                    max-width:560px;
                    background:#ffffff;
                    border:1px solid #ece9e3;
                    border-radius:20px;
                  "
                >
                  <tr>
                    <td style="padding:32px;">
                      <div style="
                        font-size:21px;
                        font-weight:700;
                        margin-bottom:28px;
                      ">
                        KiteDesk
                      </div>

                      <h1 style="
                        margin:0;
                        font-size:24px;
                        line-height:1.3;
                      ">
                        Verify your email
                      </h1>

                      <p style="
                        margin:16px 0 0;
                        color:#7a8089;
                        font-size:15px;
                        line-height:1.7;
                      ">
                        Hi
                        <strong style="color:#2e3338;">
                          ${name}
                        </strong>,
                        thanks for creating a KiteDesk account.
                        Verify your email address to activate
                        your account.
                      </p>

                      <div style="margin:28px 0;">
                        <a
                          href="${verificationUrl}"
                          style="
                            display:inline-block;
                            padding:13px 20px;
                            background:#6e94b0;
                            color:#ffffff;
                            text-decoration:none;
                            border-radius:12px;
                            font-size:14px;
                            font-weight:600;
                          "
                        >
                          Verify email address
                        </a>
                      </div>

                      <p style="
                        margin:0;
                        color:#aeb4bc;
                        font-size:12px;
                        line-height:1.6;
                      ">
                        This verification link expires on
                        ${expiration}.
                      </p>

                      <p style="
                        margin:12px 0 0;
                        color:#aeb4bc;
                        font-size:12px;
                        line-height:1.6;
                      ">
                        If you didn't create this account,
                        you can safely ignore this email.
                      </p>

                      <p style="
                        margin:20px 0 0;
                        color:#aeb4bc;
                        font-size:11px;
                        line-height:1.6;
                        word-break:break-all;
                      ">
                        If the button does not work, copy and
                        paste this link into your browser:
                        <br />
                        ${verificationUrl}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  });
}

/*
|--------------------------------------------------------------------------
| WORKSPACE INVITATION
|--------------------------------------------------------------------------
*/

type SendWorkspaceInvitationInput =
  {
    to: string;

    inviterName: string;

    workspaceName: string;

    role:
      | "OWNER"
      | "MANAGER"
      | "MEMBER";

    invitationUrl: string;

    expiresAt: Date;
  };

export async function sendWorkspaceInvitationEmail(
  input:
    SendWorkspaceInvitationInput
) {
  const inviterName =
    escapeHtml(
      input.inviterName
    );

  const workspaceName =
    escapeHtml(
      input.workspaceName
    );

  const invitationUrl =
    escapeHtml(
      input.invitationUrl
    );

  const role =
    formatRole(
      input.role
    );

  const expiration =
    input.expiresAt.toLocaleDateString(
      "en-US",
      {
        month:
          "long",

        day:
          "numeric",

        year:
          "numeric",
      }
    );

  return sendTransactionalEmail({
    to:
      input.to,

    subject:
      `You're invited to join ${input.workspaceName} on KiteDesk`,

    errorMessage:
      "The invitation email could not be sent.",

    errorCode:
      "INVITATION_EMAIL_FAILED",

    htmlContent: `
      <!doctype html>
      <html>
        <body style="
          margin:0;
          padding:0;
          background:#f7f5f1;
          font-family:Inter,Arial,sans-serif;
          color:#2e3338;
        ">
          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            role="presentation"
            style="
              padding:40px 16px;
              background:#f7f5f1;
            "
          >
            <tr>
              <td align="center">
                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  role="presentation"
                  style="
                    max-width:560px;
                    background:#ffffff;
                    border:1px solid #ece9e3;
                    border-radius:20px;
                  "
                >
                  <tr>
                    <td style="padding:32px;">
                      <div style="
                        font-size:21px;
                        font-weight:700;
                        margin-bottom:28px;
                      ">
                        KiteDesk
                      </div>

                      <h1 style="
                        margin:0;
                        font-size:24px;
                        line-height:1.3;
                      ">
                        You're invited
                      </h1>

                      <p style="
                        margin:16px 0 0;
                        color:#7a8089;
                        font-size:15px;
                        line-height:1.7;
                      ">
                        <strong style="color:#2e3338;">
                          ${inviterName}
                        </strong>
                        invited you to join
                        <strong style="color:#2e3338;">
                          ${workspaceName}
                        </strong>
                        on KiteDesk as a
                        <strong style="color:#2e3338;">
                          ${role}
                        </strong>.
                      </p>

                      <div style="margin:28px 0;">
                        <a
                          href="${invitationUrl}"
                          style="
                            display:inline-block;
                            padding:13px 20px;
                            background:#6e94b0;
                            color:#ffffff;
                            text-decoration:none;
                            border-radius:12px;
                            font-size:14px;
                            font-weight:600;
                          "
                        >
                          Accept invitation
                        </a>
                      </div>

                      <p style="
                        margin:0;
                        color:#aeb4bc;
                        font-size:12px;
                        line-height:1.6;
                      ">
                        This invitation expires on
                        ${expiration}.
                      </p>

                      <p style="
                        margin:12px 0 0;
                        color:#aeb4bc;
                        font-size:12px;
                        line-height:1.6;
                      ">
                        If you weren't expecting this
                        invitation, you can safely
                        ignore this email.
                      </p>

                      <p style="
                        margin:20px 0 0;
                        color:#aeb4bc;
                        font-size:11px;
                        line-height:1.6;
                        word-break:break-all;
                      ">
                        If the button does not work, copy and
                        paste this link into your browser:
                        <br />
                        ${invitationUrl}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  });
}

/*
|--------------------------------------------------------------------------
| FORMAT ROLE
|--------------------------------------------------------------------------
*/

function formatRole(
  role:
    | "OWNER"
    | "MANAGER"
    | "MEMBER"
) {
  if (
    role ===
    "OWNER"
  ) {
    return "Owner";
  }

  if (
    role ===
    "MANAGER"
  ) {
    return "Manager";
  }

  return "Member";
}
