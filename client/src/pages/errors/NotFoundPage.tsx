import {
  useNavigate,
} from "react-router";

/*
|--------------------------------------------------------------------------
| NOT FOUND PAGE
|--------------------------------------------------------------------------
*/

function NotFoundPage() {
  const navigate =
    useNavigate();

  return (
    <main className="flex min-h-screen items-center justify-center bg-kite-bg px-5 py-10">

      <div className="w-full max-w-[560px]">

        <div className="rounded-[24px] border border-kite-line bg-white p-7 shadow-[0_20px_60px_-35px_rgba(46,51,56,0.35)] sm:p-10">

          {/* BRAND */}
          <div className="flex items-center gap-3">

            <div className="grid h-10 w-10 place-items-center rounded-xl bg-kite-blue-wash text-kite-blue-deep">

              <KiteIcon />

            </div>

            <span className="text-sm font-semibold tracking-tight text-kite-ink">
              KiteDesk
            </span>

          </div>

          {/* ERROR CODE */}
          <div className="mt-10">

            <div className="inline-flex rounded-full border border-kite-line bg-kite-soft px-3 py-1.5 text-xs font-medium text-kite-muted">
              Error 404
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-kite-ink sm:text-4xl">
              Page not found
            </h1>

            <p className="mt-4 max-w-md text-sm leading-6 text-kite-muted">
              The page you&apos;re looking
              for doesn&apos;t exist, may
              have been moved, or you may
              have followed an outdated
              link.
            </p>

          </div>

          {/* ACTIONS */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/dashboard"
                )
              }
              className="rounded-xl bg-kite-blue-deep px-5 py-3 text-sm font-medium text-white transition hover:brightness-95"
            >
              Go to Dashboard
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(-1)
              }
              className="rounded-xl border border-kite-line bg-white px-5 py-3 text-sm font-medium text-kite-muted transition hover:bg-kite-soft hover:text-kite-ink"
            >
              Go Back
            </button>

          </div>

          {/* FOOTER */}
          <div className="mt-9 border-t border-kite-line pt-5">

            <p className="text-xs leading-5 text-kite-faint">
              If you reached this page
              from inside KiteDesk, the
              resource may no longer be
              available.
            </p>

          </div>

        </div>

      </div>

    </main>
  );
}

/*
|--------------------------------------------------------------------------
| ICON
|--------------------------------------------------------------------------
*/

function KiteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M12 3 19 10 12 17 5 10 12 3Z" />

      <path d="M12 17c0 2.5-2 2.5-2 4" />

      <path d="M10 21c1-1 2-1 3 0" />
    </svg>
  );
}

export default NotFoundPage;