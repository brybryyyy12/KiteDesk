import nodemailer from "nodemailer";

import {
  env,
} from "../config/env.js";

import {
  AppError,
} from "../utils/AppError.js";

/*
|--------------------------------------------------------------------------
| SMTP TRANSPORT
|--------------------------------------------------------------------------
|
| Gmail SMTP is currently used for
| KiteDesk transactional emails.
|
| The account must use a Google
| App Password rather than the
| normal Gmail password.
|
*/

const transporter =
  nodemailer.createTransport({
    host:
      env.SMTP_HOST,

    port:
      env.SMTP_PORT,

    secure:
      env.SMTP_SECURE,

    auth: {
      user:
        env.SMTP_USER,

      pass:
        env.SMTP_APP_PASSWORD,
    },
  });

/*
|--------------------------------------------------------------------------
| HTML ESCAPING
|--------------------------------------------------------------------------
|
| User-provided values are escaped
| before being inserted into HTML.
|
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
    input.expiresAt.toLocaleDateString(
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
      }
    );

  try {
    const info =
      await transporter.sendMail({
        from:
          env.EMAIL_FROM,

        to:
          input.to,

        subject:
          "Verify your email address for KiteDesk",

        text: [
          `Hi ${input.name},`,
          "",
          "Thanks for creating a KiteDesk account.",
          "",
          "Verify your email address:",
          input.verificationUrl,
          "",
          `This verification link expires on ${expiration}.`,
          "",
          "If you did not create this account, you can ignore this email.",
        ].join("\n"),

        html: `
          <!doctype html>

          <html>
            <body
              style="
                margin:0;
                padding:0;
                background:#f7f5f1;
                font-family:Inter,Arial,sans-serif;
                color:#2e3338;
              "
            >

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
                        <td
                          style="
                            padding:32px;
                          "
                        >

                          <div
                            style="
                              font-size:21px;
                              font-weight:700;
                              margin-bottom:28px;
                            "
                          >
                            KiteDesk
                          </div>

                          <h1
                            style="
                              margin:0;
                              font-size:24px;
                              line-height:1.3;
                            "
                          >
                            Verify your email
                          </h1>

                          <p
                            style="
                              margin:16px 0 0;
                              color:#7a8089;
                              font-size:15px;
                              line-height:1.7;
                            "
                          >

                            Hi

                            <strong
                              style="
                                color:#2e3338;
                              "
                            >
                              ${name}
                            </strong>,

                            thanks for creating a
                            KiteDesk account.

                            Verify your email address
                            to activate your account.

                          </p>

                          <div
                            style="
                              margin:28px 0;
                            "
                          >

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

                          <p
                            style="
                              margin:0;
                              color:#aeb4bc;
                              font-size:12px;
                              line-height:1.6;
                            "
                          >
                            This verification link
                            expires on ${expiration}.
                          </p>

                          <p
                            style="
                              margin:12px 0 0;
                              color:#aeb4bc;
                              font-size:12px;
                              line-height:1.6;
                            "
                          >
                            If you didn't create this
                            account, you can safely
                            ignore this email.
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

    return info;
  } catch (
    error
  ) {
    console.error(
      "Gmail verification email failed:",
      error
    );

    throw new AppError(
      "The verification email could not be sent.",
      502,
      "VERIFICATION_EMAIL_FAILED"
    );
  }
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

  try {
    const info =
      await transporter.sendMail({
        from:
          env.EMAIL_FROM,

        to:
          input.to,

        subject:
          `You're invited to join ${input.workspaceName} on KiteDesk`,

        text: [
          `${input.inviterName} invited you to join ${input.workspaceName} on KiteDesk as a ${role}.`,
          "",
          "Accept your invitation:",
          input.invitationUrl,
          "",
          `This invitation expires on ${expiration}.`,
          "",
          "If you were not expecting this invitation, you can ignore this email.",
        ].join("\n"),

        html: `
          <!doctype html>

          <html>
            <body
              style="
                margin:0;
                padding:0;
                background:#f7f5f1;
                font-family:Inter,Arial,sans-serif;
                color:#2e3338;
              "
            >

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
                        <td
                          style="
                            padding:32px;
                          "
                        >

                          <div
                            style="
                              font-size:21px;
                              font-weight:700;
                              margin-bottom:28px;
                            "
                          >
                            KiteDesk
                          </div>

                          <h1
                            style="
                              margin:0;
                              font-size:24px;
                              line-height:1.3;
                            "
                          >
                            You're invited
                          </h1>

                          <p
                            style="
                              margin:16px 0 0;
                              color:#7a8089;
                              font-size:15px;
                              line-height:1.7;
                            "
                          >

                            <strong
                              style="
                                color:#2e3338;
                              "
                            >
                              ${inviterName}
                            </strong>

                            invited you to join

                            <strong
                              style="
                                color:#2e3338;
                              "
                            >
                              ${workspaceName}
                            </strong>

                            on KiteDesk as a

                            <strong
                              style="
                                color:#2e3338;
                              "
                            >
                              ${role}
                            </strong>.

                          </p>

                          <div
                            style="
                              margin:28px 0;
                            "
                          >

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

                          <p
                            style="
                              margin:0;
                              color:#aeb4bc;
                              font-size:12px;
                              line-height:1.6;
                            "
                          >
                            This invitation expires
                            on ${expiration}.
                          </p>

                          <p
                            style="
                              margin:12px 0 0;
                              color:#aeb4bc;
                              font-size:12px;
                              line-height:1.6;
                            "
                          >
                            If you weren't expecting
                            this invitation, you can
                            safely ignore this email.
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

    return info;
  } catch (
    error
  ) {
    console.error(
      "Gmail invitation email failed:",
      error
    );

    throw new AppError(
      "The invitation email could not be sent.",
      502,
      "INVITATION_EMAIL_FAILED"
    );
  }
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