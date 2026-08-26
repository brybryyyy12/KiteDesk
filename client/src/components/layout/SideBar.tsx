import {
  NavLink,
} from "react-router";

type SidebarProps = {
  isOpen: boolean;

  onClose: () => void;
};

const navigation = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: "dashboard",
  },

  {
    label: "My Tasks",
    to: "/my-tasks",
    icon: "tasks",
  },

  {
    label: "Projects",
    to: "/projects",
    icon: "projects",
  },

  {
    label: "Workspace",
    to: "/workspace",
    icon: "workspace",
  },
];

function Sidebar({
  isOpen,
  onClose,
}: SidebarProps) {
  return (
    <>
      {/* MOBILE BACKDROP */}
      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={
            onClose
          }
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px] lg:hidden"
        />
      )}

      <aside
        id="app-sidebar"
        aria-label="Primary navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(280px,calc(100vw-48px))] flex-col border-r border-kite-line bg-white shadow-[18px_0_50px_-30px_rgba(46,51,56,0.45)] transition-transform duration-200 ease-out sm:w-[280px] lg:w-[250px] lg:translate-x-0 lg:shadow-none ${
          isOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >

        {/* LOGO */}
        <div className="flex h-[73px] shrink-0 items-center justify-between border-b border-kite-line px-4 sm:px-5">

          <NavLink
            to="/dashboard"
            onClick={
              onClose
            }
            className="flex min-w-0 items-center gap-3 rounded-xl"
          >

            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-kite-blue to-kite-blue-deep text-white shadow-sm">

              <svg
                viewBox="0 0 32 32"
                fill="none"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  d="M16 3 27 14 16 28 5 14 16 3Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />

                <path
                  d="m16 28 4-8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                <path
                  d="m20 20 5 3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>

            </div>

            <span className="truncate text-lg font-semibold tracking-tight text-kite-ink">
              Kite
              <span className="text-kite-blue-deep">
                Desk
              </span>
            </span>

          </NavLink>

          {/* MOBILE CLOSE */}
          <button
            type="button"
            onClick={
              onClose
            }
            aria-label="Close navigation menu"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-kite-muted transition hover:bg-kite-soft hover:text-kite-ink lg:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>

        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">

          {navigation.map(
            (item) => (
              <NavLink
                key={
                  item.to
                }
                to={
                  item.to
                }
                onClick={
                  onClose
                }
                className={({
                  isActive,
                }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-kite-blue-wash text-kite-blue-deep"
                      : "text-kite-muted hover:bg-kite-soft hover:text-kite-ink"
                  }`
                }
              >

                <NavigationIcon
                  icon={
                    item.icon
                  }
                />

                <span className="truncate">
                  {item.label}
                </span>

              </NavLink>
            )
          )}

        </nav>

        {/* FOOTER */}
        <div className="shrink-0 border-t border-kite-line px-5 py-4">

          <p className="text-[11px] text-kite-faint">
            KiteDesk
          </p>

          <p className="mt-0.5 text-[10px] text-kite-faint">
            Work organized simply.
          </p>

        </div>

      </aside>
    </>
  );
}

function NavigationIcon({
  icon,
}: {
  icon: string;
}) {
  const className =
    "h-5 w-5 shrink-0";

  if (
    icon ===
    "dashboard"
  ) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        className={
          className
        }
        aria-hidden="true"
      >
        <rect
          x="3"
          y="3"
          width="7"
          height="7"
          rx="2"
        />

        <rect
          x="14"
          y="3"
          width="7"
          height="7"
          rx="2"
        />

        <rect
          x="3"
          y="14"
          width="7"
          height="7"
          rx="2"
        />

        <rect
          x="14"
          y="14"
          width="7"
          height="7"
          rx="2"
        />
      </svg>
    );
  }

  if (
    icon ===
    "tasks"
  ) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        className={
          className
        }
        aria-hidden="true"
      >
        <path d="M8 6h12M8 12h12M8 18h12" />

        <path d="m3 6 1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2" />
      </svg>
    );
  }

  if (
    icon ===
    "projects"
  ) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        className={
          className
        }
        aria-hidden="true"
      >
        <path d="M3 7.5a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className={
        className
      }
      aria-hidden="true"
    >
      <circle
        cx="9"
        cy="8"
        r="3"
      />

      <circle
        cx="17"
        cy="9"
        r="2.5"
      />

      <path d="M3.5 19c.6-3.3 2.5-5 5.5-5s4.9 1.7 5.5 5" />

      <path d="M14.5 15c2.8-.4 5 .8 6 3.5" />
    </svg>
  );
}

export default Sidebar;
