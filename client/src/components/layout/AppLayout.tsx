import {
  useEffect,
  useState,
} from "react";

import {
  Outlet,
  useLocation,
} from "react-router";

import Sidebar from "./SideBar";
import Topbar from "./TopBar";

function AppLayout() {
  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  const location =
    useLocation();

  /*
  |--------------------------------------------------------------------------
  | CLOSE MOBILE SIDEBAR AFTER NAVIGATION
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      setSidebarOpen(false);
    },
    [
      location.pathname,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | MOBILE DRAWER BEHAVIOR
  |--------------------------------------------------------------------------
  |
  | Prevent the page behind the sidebar from scrolling while
  | the mobile drawer is open, and allow Escape to close it.
  |
  */

  useEffect(
    () => {
      if (!sidebarOpen) {
        return;
      }

      const previousOverflow =
        document.body.style.overflow;

      document.body.style.overflow =
        "hidden";

      const handleKeyDown = (
        event: KeyboardEvent
      ) => {
        if (
          event.key ===
          "Escape"
        ) {
          setSidebarOpen(
            false
          );
        }
      };

      document.addEventListener(
        "keydown",
        handleKeyDown
      );

      return () => {
        document.body.style.overflow =
          previousOverflow;

        document.removeEventListener(
          "keydown",
          handleKeyDown
        );
      };
    },
    [
      sidebarOpen,
    ]
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-kite-bg">

      <Sidebar
        isOpen={
          sidebarOpen
        }
        onClose={() =>
          setSidebarOpen(
            false
          )
        }
      />

      <div className="min-w-0 lg:pl-[250px]">

        <Topbar
          isMenuOpen={
            sidebarOpen
          }
          onMenuClick={() =>
            setSidebarOpen(
              true
            )
          }
        />

        <main className="min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">

          <div className="min-w-0">
            <Outlet />
          </div>

        </main>

      </div>

    </div>
  );
}

export default AppLayout;
