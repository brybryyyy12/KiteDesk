import {
  Link,
} from "react-router";

type AccessDeniedPageProps = {
  title?: string;
  description?: string;
  backTo?: string;
  backLabel?: string;
};

function AccessDeniedPage({
  title = "Access denied",
  description =
    "You don't have permission to access this area.",
  backTo = "/dashboard",
  backLabel = "Back to Dashboard",
}: AccessDeniedPageProps) {
  return (
    <div className="mx-auto max-w-[1500px]">

      <section className="rounded-2xl border border-kite-line bg-white px-6 py-16 text-center">

        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-kite-soft text-kite-muted">

          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8"
            aria-hidden="true"
          >
            <rect
              x="5"
              y="10"
              width="14"
              height="10"
              rx="2"
            />

            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>

        </div>

        <div className="mx-auto mt-5 inline-flex rounded-full border border-kite-line bg-kite-soft px-3 py-1.5 text-xs font-medium text-kite-muted">
          Access restricted
        </div>

        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-kite-ink">
          {title}
        </h1>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-kite-muted">
          {description}
        </p>

        <Link
          to={backTo}
          className="mt-6 inline-flex rounded-xl bg-kite-blue-deep px-5 py-3 text-sm font-medium text-white transition hover:brightness-95"
        >
          {backLabel}
        </Link>

      </section>

    </div>
  );
}

export default AccessDeniedPage;