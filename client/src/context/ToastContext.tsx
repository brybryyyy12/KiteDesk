import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  createPortal,
} from "react-dom";

export type ToastType =
  | "success"
  | "error"
  | "warning"
  | "info";

export type ToastOptions = {
  title?: string;
  duration?: number;
};

type ToastItem =
  ToastOptions & {
    id: string;
    type: ToastType;
    message: string;
    exiting: boolean;
  };

type ToastPayload = {
  type: ToastType;
  message: string;
  options?: ToastOptions;
};

type ToastListener = (
  payload: ToastPayload
) => string;

let listener:
  ToastListener | null =
  null;

let sequence = 0;

/*
|--------------------------------------------------------------------------
| PUBLIC TOAST API
|--------------------------------------------------------------------------
|
| Can be imported anywhere:
|
| toast.success("Task created.");
| toast.error("Unable to save task.");
|
*/

function emit(
  type: ToastType,
  message: string,
  options?: ToastOptions
) {
  return (
    listener?.({
      type,
      message,
      options,
    }) ?? ""
  );
}

export const toast = {
  success(
    message: string,
    options?: ToastOptions
  ) {
    return emit(
      "success",
      message,
      options
    );
  },

  error(
    message: string,
    options?: ToastOptions
  ) {
    return emit(
      "error",
      message,
      options
    );
  },

  warning(
    message: string,
    options?: ToastOptions
  ) {
    return emit(
      "warning",
      message,
      options
    );
  },

  info(
    message: string,
    options?: ToastOptions
  ) {
    return emit(
      "info",
      message,
      options
    );
  },
};

/*
|--------------------------------------------------------------------------
| DEFAULT DISPLAY TIME
|--------------------------------------------------------------------------
*/

function defaultDuration(
  type: ToastType
) {
  if (
    type === "error"
  ) {
    return 6000;
  }

  if (
    type === "warning"
  ) {
    return 5500;
  }

  return 4500;
}

/*
|--------------------------------------------------------------------------
| PROVIDER
|--------------------------------------------------------------------------
*/

type ToastProviderProps = {
  children: ReactNode;
};

export function ToastProvider({
  children,
}: ToastProviderProps) {
  const [
    toasts,
    setToasts,
  ] =
    useState<
      ToastItem[]
    >([]);

  const autoTimers =
    useRef(
      new Map<
        string,
        ReturnType<
          typeof setTimeout
        >
      >()
    );

  const removeTimers =
    useRef(
      new Map<
        string,
        ReturnType<
          typeof setTimeout
        >
      >()
    );

  /*
  |--------------------------------------------------------------------------
  | DISMISS
  |--------------------------------------------------------------------------
  */

  const dismiss =
    useCallback(
      (
        id: string
      ) => {
        /*
         * Already leaving.
         */
        if (
          removeTimers.current.has(
            id
          )
        ) {
          return;
        }

        /*
         * Stop automatic timer.
         */
        const autoTimer =
          autoTimers.current.get(
            id
          );

        if (
          autoTimer
        ) {
          clearTimeout(
            autoTimer
          );

          autoTimers.current.delete(
            id
          );
        }

        /*
         * Trigger exit animation.
         */
        setToasts(
          (
            current
          ) =>
            current.map(
              (
                item
              ) =>
                item.id ===
                id
                  ? {
                      ...item,
                      exiting:
                        true,
                    }
                  : item
            )
        );

        /*
         * Remove after animation.
         */
        const removeTimer =
          setTimeout(
            () => {
              setToasts(
                (
                  current
                ) =>
                  current.filter(
                    (
                      item
                    ) =>
                      item.id !==
                      id
                  )
              );

              removeTimers.current.delete(
                id
              );
            },
            220
          );

        removeTimers.current.set(
          id,
          removeTimer
        );
      },
      []
    );

  /*
  |--------------------------------------------------------------------------
  | SHOW
  |--------------------------------------------------------------------------
  */

  const show =
    useCallback(
      ({
        type,
        message,
        options,
      }: ToastPayload) => {
        sequence += 1;

        const id =
          `toast-${Date.now()}-${sequence}`;

        const duration =
          options?.duration ??
          defaultDuration(
            type
          );

        setToasts(
          (
            current
          ) =>
            [
              ...current,

              {
                id,
                type,
                message,

                title:
                  options?.title,

                duration,

                exiting:
                  false,
              },
            ].slice(
              -4
            )
        );

        /*
         * duration: 0 means
         * don't auto dismiss.
         */
        if (
          duration > 0
        ) {
          const timer =
            setTimeout(
              () =>
                dismiss(
                  id
                ),
              duration
            );

          autoTimers.current.set(
            id,
            timer
          );
        }

        return id;
      },
      [
        dismiss,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | CONNECT GLOBAL API
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      listener =
        show;

      return () => {
        if (
          listener ===
          show
        ) {
          listener =
            null;
        }
      };
    },
    [
      show,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | CLEANUP
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      const currentAutoTimers =
        autoTimers.current;

      const currentRemoveTimers =
        removeTimers.current;

      return () => {
        currentAutoTimers.forEach(
          clearTimeout
        );

        currentRemoveTimers.forEach(
          clearTimeout
        );
      };
    },
    []
  );

  return (
    <>
      {children}

      {typeof document !==
        "undefined" &&
        createPortal(
          <ToastViewport
            toasts={
              toasts
            }
            onDismiss={
              dismiss
            }
          />,
          document.body
        )}
    </>
  );
}

/*
|--------------------------------------------------------------------------
| VIEWPORT
|--------------------------------------------------------------------------
*/

type ToastViewportProps = {
  toasts: ToastItem[];

  onDismiss: (
    id: string
  ) => void;
};

function ToastViewport({
  toasts,
  onDismiss,
}: ToastViewportProps) {
  if (
    toasts.length ===
    0
  ) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-3 top-3 z-[250] flex flex-col gap-2 sm:left-auto sm:right-4 sm:top-4 sm:w-[380px]"
      aria-live="polite"
      aria-atomic="false"
    >

      {toasts.map(
        (
          item
        ) => (
          <ToastCard
            key={
              item.id
            }
            item={
              item
            }
            onDismiss={
              onDismiss
            }
          />
        )
      )}

      <style>
        {`
          @keyframes kitedesk-toast-enter {
            from {
              opacity: 0;
              transform:
                translate3d(
                  0,
                  -8px,
                  0
                )
                scale(0.985);
            }

            to {
              opacity: 1;
              transform:
                translate3d(
                  0,
                  0,
                  0
                )
                scale(1);
            }
          }

          @keyframes kitedesk-toast-progress {
            from {
              transform:
                scaleX(1);
            }

            to {
              transform:
                scaleX(0);
            }
          }

          .kitedesk-toast-enter {
            animation:
              kitedesk-toast-enter
              280ms
              cubic-bezier(
                0.22,
                1,
                0.36,
                1
              )
              both;
          }

          .kitedesk-toast-progress {
            animation-name:
              kitedesk-toast-progress;

            animation-timing-function:
              linear;

            animation-fill-mode:
              forwards;
          }

          @media (
            prefers-reduced-motion:
            reduce
          ) {
            .kitedesk-toast-enter,
            .kitedesk-toast-progress {
              animation:
                none !important;
            }
          }
        `}
      </style>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| TOAST CARD
|--------------------------------------------------------------------------
*/

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;

  onDismiss: (
    id: string
  ) => void;
}) {
  const style =
    getToastStyle(
      item.type
    );

  return (
    <div
      role={
        item.type ===
        "error"
          ? "alert"
          : "status"
      }
      className={`pointer-events-auto overflow-hidden rounded-2xl border bg-white shadow-[0_18px_55px_-24px_rgba(46,51,56,0.38)] transition-[opacity,transform] duration-200 ${style.border} ${
        item.exiting
          ? "-translate-y-1.5 scale-[0.985] opacity-0"
          : "kitedesk-toast-enter opacity-100"
      }`}
    >

      <div className="flex min-w-0 items-start gap-3 p-3.5 sm:p-4">

        {/* ICON */}
        <div
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${style.icon}`}
        >
          <ToastIcon
            type={
              item.type
            }
          />
        </div>

        {/* MESSAGE */}
        <div className="min-w-0 flex-1 pt-0.5">

          {item.title && (
            <p className="break-words text-sm font-semibold text-kite-ink">
              {
                item.title
              }
            </p>
          )}

          <p
            className={`break-words text-sm leading-5 ${
              item.title
                ? "mt-1 text-kite-muted"
                : "text-kite-ink"
            }`}
          >
            {
              item.message
            }
          </p>

        </div>

        {/* CLOSE */}
        <button
          type="button"
          onClick={() =>
            onDismiss(
              item.id
            )
          }
          aria-label="Dismiss notification"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-lg leading-none text-kite-faint transition hover:bg-kite-soft hover:text-kite-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-kite-blue"
        >
          ×
        </button>

      </div>

      {/* TIMER */}
      {item.duration !==
        0 && (
        <div className="h-0.5 bg-kite-soft">

          <div
            className={`kitedesk-toast-progress h-full origin-left ${style.progress}`}
            style={{
              animationDuration:
                `${item.duration}ms`,
            }}
          />

        </div>
      )}

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| ICONS
|--------------------------------------------------------------------------
*/

function ToastIcon({
  type,
}: {
  type:
    ToastType;
}) {
  if (
    type ===
    "success"
  ) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d="m5 12 4 4 10-10" />
      </svg>
    );
  }

  if (
    type ===
    "error"
  ) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="8"
        />

        <path d="m9 9 6 6M15 9l-6 6" />
      </svg>
    );
  }

  if (
    type ===
    "warning"
  ) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d="M12 4 3.5 19h17Z" />

        <path d="M12 9v4M12 16h.01" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="8"
      />

      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

/*
|--------------------------------------------------------------------------
| COLORS
|--------------------------------------------------------------------------
*/

function getToastStyle(
  type: ToastType
) {
  switch (
    type
  ) {
    case "success":
      return {
        border:
          "border-emerald-100",

        icon:
          "bg-emerald-50 text-emerald-600",

        progress:
          "bg-emerald-400",
      };

    case "error":
      return {
        border:
          "border-red-100",

        icon:
          "bg-red-50 text-red-600",

        progress:
          "bg-red-400",
      };

    case "warning":
      return {
        border:
          "border-amber-100",

        icon:
          "bg-amber-50 text-amber-600",

        progress:
          "bg-amber-400",
      };

    case "info":
      return {
        border:
          "border-kite-line",

        icon:
          "bg-kite-blue-wash text-kite-blue-deep",

        progress:
          "bg-kite-blue-deep",
      };
  }
}