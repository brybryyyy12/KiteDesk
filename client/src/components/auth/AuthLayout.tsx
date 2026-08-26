import {
  type ReactNode,
} from "react";

import {
  Link,
  useLocation,
} from "react-router";

import KiteDeskLogo from "./KiteDeskLogo";

type AuthLayoutProps = {
  active:
    | "login"
    | "register";

  children:
    ReactNode;
};

function AuthLayout({
  active,
  children,
}: AuthLayoutProps) {
  const location =
    useLocation();

  /*
  |--------------------------------------------------------------------------
  | PRESERVE RETURN-TO QUERY
  |--------------------------------------------------------------------------
  |
  | Example:
  |
  | /login?returnTo=/invitations/abc
  |
  | Switching to Register becomes:
  |
  | /register?returnTo=/invitations/abc
  |
  */

  const loginUrl =
    `/login${location.search}`;

  const registerUrl =
    `/register${location.search}`;

  return (
    <>
      {/*
      |--------------------------------------------------------------------------
      | AUTH TRANSITIONS
      |--------------------------------------------------------------------------
      |
      | Kept here so this component is
      | copy-paste ready without requiring
      | another CSS file.
      |
      */}

      <style>
        {`
          @keyframes kitedesk-auth-login-in {
            0% {
              opacity: 0;
              transform: translate3d(-12px, 5px, 0) scale(0.995);
              filter: blur(1px);
            }

            100% {
              opacity: 1;
              transform: translate3d(0, 0, 0) scale(1);
              filter: blur(0);
            }
          }

          @keyframes kitedesk-auth-register-in {
            0% {
              opacity: 0;
              transform: translate3d(12px, 5px, 0) scale(0.995);
              filter: blur(1px);
            }

            100% {
              opacity: 1;
              transform: translate3d(0, 0, 0) scale(1);
              filter: blur(0);
            }
          }

          @keyframes kitedesk-pill-login {
            0% {
              transform: translateX(100%);
              opacity: 0.7;
            }

            100% {
              transform: translateX(0);
              opacity: 1;
            }
          }

          @keyframes kitedesk-pill-register {
            0% {
              transform: translateX(0);
              opacity: 0.7;
            }

            100% {
              transform: translateX(100%);
              opacity: 1;
            }
          }

          .kitedesk-auth-panel-login {
            animation:
              kitedesk-auth-login-in
              360ms
              cubic-bezier(0.22, 1, 0.36, 1)
              both;
          }

          .kitedesk-auth-panel-register {
            animation:
              kitedesk-auth-register-in
              360ms
              cubic-bezier(0.22, 1, 0.36, 1)
              both;
          }

          .kitedesk-auth-pill-login {
            animation:
              kitedesk-pill-login
              420ms
              cubic-bezier(0.22, 1, 0.36, 1)
              both;
          }

          .kitedesk-auth-pill-register {
            animation:
              kitedesk-pill-register
              420ms
              cubic-bezier(0.22, 1, 0.36, 1)
              both;
          }

          @media (prefers-reduced-motion: reduce) {
            .kitedesk-auth-panel-login,
            .kitedesk-auth-panel-register,
            .kitedesk-auth-pill-login,
            .kitedesk-auth-pill-register {
              animation: none !important;
            }
          }
        `}
      </style>

      <main className="auth-background min-h-[100dvh] overflow-x-hidden bg-kite-bg sm:p-6 lg:p-8">

        <div className="mx-auto flex min-h-[100dvh] w-full max-w-6xl overflow-hidden bg-white/80 backdrop-blur-sm sm:min-h-[calc(100dvh-3rem)] sm:rounded-[30px] sm:border sm:border-kite-line sm:shadow-[0_20px_60px_-30px_rgba(46,51,56,0.22)] lg:min-h-[calc(100dvh-4rem)]">

          {/* LEFT BRANDING SIDE */}
          <section className="relative hidden w-[52%] overflow-hidden border-r border-kite-line lg:flex lg:flex-col lg:justify-center">

            <div className="relative z-10 px-14 py-14 xl:px-20">

              {/* LARGE KITE */}
              <div className="relative mb-12">

                <div className="flex h-44 w-44 items-center justify-center rounded-[42px] border border-kite-line bg-white/70 shadow-[0_20px_50px_-30px_rgba(46,51,56,0.25)] backdrop-blur">

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#2e3338"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-28 w-28"
                    aria-hidden="true"
                  >

                    <g transform="rotate(45 12 12)">

                      <path
                        d="M12 2.5 19.5 9 12 21.5 4.5 9Z"
                        fill="#EAF1F6"
                      />

                      <path d="M12 2.5V21.5M4.5 9H19.5" />

                      <path d="M12 21.5c-2.2 1.7-4.3 1.6-6.1.3" />

                    </g>

                  </svg>

                </div>

                {/* FLOATING CHECK */}
                <div className="absolute -right-5 bottom-2 flex h-14 w-14 items-center justify-center rounded-2xl border border-kite-line bg-white shadow-sm">

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#6e94b0"
                    strokeWidth="1.5"
                    className="h-7 w-7"
                    aria-hidden="true"
                  >
                    <path d="M5 12.5 9.5 17 19 7.5" />
                  </svg>

                </div>

              </div>

              {/* MAIN COPY */}
              <div className="max-w-md">

                <h1 className="text-5xl font-semibold leading-[1.08] tracking-[-0.03em] text-kite-ink">
                  Keep your team
                  <br />
                  moving.
                </h1>

                <p className="mt-6 max-w-sm text-[15px] leading-7 text-kite-muted">
                  Keep projects, responsibilities, and progress clear
                  without adding unnecessary complexity.
                </p>

              </div>

              {/* FEATURES */}
              <div className="mt-12 max-w-md space-y-1">

                <AuthFeature
                  number="01"
                  title="Organize"
                  description="Keep projects and tasks in one place."
                />

                <AuthFeature
                  number="02"
                  title="Track"
                  description="Know what is happening and what comes next."
                />

                <AuthFeature
                  number="03"
                  title="Collaborate"
                  description="Keep work, feedback, and decisions connected."
                  last
                />

              </div>

              <p className="mt-12 text-xs tracking-wide text-kite-faint">
                SIMPLE WORK MANAGEMENT FOR FOCUSED TEAMS
              </p>

            </div>

            {/* BACKGROUND KITE */}
            <svg
              className="pointer-events-none absolute -right-16 top-12 h-[420px] w-[420px] opacity-[0.08]"
              viewBox="0 0 400 400"
              fill="none"
              aria-hidden="true"
            >

              <path
                d="M200 40 335 165 200 355 65 165Z"
                stroke="#6e94b0"
                strokeWidth="1.3"
              />

              <path
                d="M200 40V355M65 165H335"
                stroke="#6e94b0"
                strokeWidth="1"
              />

            </svg>

            {/* BACKGROUND BLOBS */}
            <div className="pointer-events-none absolute -bottom-40 -left-32 h-[450px] w-[450px] rounded-full bg-kite-blue-wash/70 blur-3xl" />

            <div className="pointer-events-none absolute -right-24 top-20 h-72 w-72 rounded-full bg-white/70 blur-3xl" />

          </section>

          {/* AUTH SIDE */}
          <section className="flex min-w-0 w-full items-start justify-center px-4 py-5 sm:items-center sm:px-8 sm:py-8 lg:w-[48%] lg:px-10 xl:px-12">

            <div className="w-full max-w-[430px]">

              {/*
              |--------------------------------------------------------------------------
              | MOBILE / DESKTOP AUTH CARD
              |--------------------------------------------------------------------------
              |
              | Mobile:
              | flatter and uses more available width.
              |
              | Tablet/Desktop:
              | returns to elevated card.
              */}

              <div className="w-full bg-white px-1 py-3 sm:rounded-[24px] sm:border sm:border-kite-line sm:px-8 sm:py-9 sm:shadow-[0_14px_40px_-25px_rgba(46,51,56,0.22)] lg:px-9 lg:py-10">

                {/* LOGO */}
                <div className="mb-6 sm:mb-8">
                  <KiteDeskLogo />
                </div>

                {/* LOGIN / REGISTER TABS */}
                <div className="relative mb-6 flex overflow-hidden rounded-full border border-kite-line bg-kite-soft p-1 sm:mb-8">

                  {/* SLIDING PILL */}
                  <span
                    aria-hidden="true"
                    className={`absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full bg-white shadow-sm will-change-transform ${
                      active ===
                      "register"
                        ? "kitedesk-auth-pill-register"
                        : "kitedesk-auth-pill-login"
                    }`}
                    style={{
                      width:
                        "calc(50% - 4px)",
                    }}
                  />

                  <Link
                    to={loginUrl}
                    aria-current={
                      active ===
                      "login"
                        ? "page"
                        : undefined
                    }
                    className={`relative z-10 flex min-h-10 flex-1 items-center justify-center rounded-full px-3 py-2.5 text-center text-sm font-medium transition-colors duration-300 ${
                      active ===
                      "login"
                        ? "text-kite-ink"
                        : "text-kite-muted hover:text-kite-ink"
                    }`}
                  >
                    Log in
                  </Link>

                  <Link
                    to={registerUrl}
                    aria-current={
                      active ===
                      "register"
                        ? "page"
                        : undefined
                    }
                    className={`relative z-10 flex min-h-10 flex-1 items-center justify-center rounded-full px-3 py-2.5 text-center text-sm font-medium transition-colors duration-300 ${
                      active ===
                      "register"
                        ? "text-kite-ink"
                        : "text-kite-muted hover:text-kite-ink"
                    }`}
                  >
                    Register
                  </Link>

                </div>

                {/* ANIMATED PAGE */}
                <div
                  key={active}
                  className={
                    active ===
                    "login"
                      ? "kitedesk-auth-panel-login"
                      : "kitedesk-auth-panel-register"
                  }
                >
                  {children}
                </div>

              </div>

              {/* MOBILE FOOTER */}
              <p className="mt-6 text-center text-[10px] uppercase tracking-[0.12em] text-kite-faint lg:hidden">
                Simple work management for focused teams
              </p>

            </div>

          </section>

        </div>

      </main>
    </>
  );
}

/*
|--------------------------------------------------------------------------
| FEATURE
|--------------------------------------------------------------------------
*/

function AuthFeature({
  number,
  title,
  description,
  last = false,
}: {
  number: string;

  title: string;

  description: string;

  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-4 py-4 ${
        last
          ? ""
          : "border-b border-kite-line"
      }`}
    >

      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-medium text-kite-muted">
        {number}
      </span>

      <div className="min-w-0">

        <p className="text-sm font-medium text-kite-ink">
          {title}
        </p>

        <p className="mt-0.5 text-sm text-kite-muted">
          {description}
        </p>

      </div>

    </div>
  );
}

export default AuthLayout;