import { useLocation } from "react-router";

function ComingSoonPage() {
  const location = useLocation();

  const title =
    location.pathname
      .replace("/", "")
      .replace("-", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      ) || "Page";

  return (
    <div className="mx-auto max-w-[1500px]">

      <div className="rounded-2xl border border-kite-line bg-white p-8">

        <p className="text-sm text-kite-muted">
          KiteDesk
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {title}
        </h1>

        <p className="mt-3 max-w-lg text-sm leading-6 text-kite-muted">
          We&apos;ll build this section next.
        </p>

      </div>

    </div>
  );
}

export default ComingSoonPage;