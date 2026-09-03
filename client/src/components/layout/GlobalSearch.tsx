import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router";

import {
  useWorkspace,
} from "../../context/WorkspaceContext";

import {
  ApiError,
} from "../../lib/api";

import {
  searchService,
  type SearchProjectResult,
  type SearchTaskResult,
} from "../../services/search.service";

type SearchResults = {
  projects: SearchProjectResult[];
  tasks: SearchTaskResult[];
};

const emptyResults: SearchResults = {
  projects: [],
  tasks: [],
};

function formatStatus(
  value: string
) {
  return value
    .toLowerCase()
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

function GlobalSearch() {
  const navigate =
    useNavigate();

  const { workspace } =
    useWorkspace();

  const containerRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const [query, setQuery] =
    useState("");

  const [results, setResults] =
    useState<SearchResults>(
      emptyResults
    );

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [isOpen, setIsOpen] =
    useState(false);

  const trimmedQuery =
    query.trim();

  useEffect(
    () => {
      setQuery("");
      setResults(emptyResults);
      setError("");
      setIsOpen(false);
    },
    [workspace?.id]
  );

  useEffect(
    () => {
      const handlePointerDown =
        (event: MouseEvent) => {
          if (
            event.target instanceof Node &&
            !containerRef.current?.contains(
              event.target
            )
          ) {
            setIsOpen(false);
          }
        };

      const handleKeyDown =
        (event: KeyboardEvent) => {
          if (event.key === "Escape") {
            setIsOpen(false);
          }
        };

      document.addEventListener(
        "mousedown",
        handlePointerDown
      );
      document.addEventListener(
        "keydown",
        handleKeyDown
      );

      return () => {
        document.removeEventListener(
          "mousedown",
          handlePointerDown
        );
        document.removeEventListener(
          "keydown",
          handleKeyDown
        );
      };
    },
    []
  );

  useEffect(
    () => {
      if (
        !workspace ||
        trimmedQuery.length < 2
      ) {
        setResults(emptyResults);
        setError("");
        setIsLoading(false);
        return;
      }

      const controller =
        new AbortController();

      const timeout =
        window.setTimeout(
          async () => {
            setIsLoading(true);
            setError("");

            try {
              const response =
                await searchService.search(
                  workspace.id,
                  trimmedQuery,
                  controller.signal
                );

              setResults({
                projects:
                  response.data.projects,
                tasks:
                  response.data.tasks,
              });
            } catch (caughtError) {
              if (controller.signal.aborted) {
                return;
              }

              setResults(emptyResults);
              setError(
                caughtError instanceof ApiError
                  ? caughtError.message
                  : "Unable to search KiteDesk."
              );
            } finally {
              if (!controller.signal.aborted) {
                setIsLoading(false);
              }
            }
          },
          300
        );

      return () => {
        window.clearTimeout(timeout);
        controller.abort();
      };
    },
    [workspace, trimmedQuery]
  );

  const goTo =
    (path: string) => {
      setIsOpen(false);
      setQuery("");
      navigate(path);
    };

  const hasResults =
    results.projects.length > 0 ||
    results.tasks.length > 0;

  const showPanel =
    isOpen &&
    Boolean(workspace) &&
    trimmedQuery.length > 0;

  return (
    <div
      ref={containerRef}
      className="relative mx-auto min-w-0 flex-1 max-w-[420px]"
    >
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-kite-faint"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>

        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          aria-label="Search KiteDesk"
          aria-expanded={showPanel}
          placeholder={
            workspace
              ? "Search projects and tasks..."
              : "Select a workspace to search"
          }
          disabled={!workspace}
          maxLength={100}
          className="w-full rounded-xl border border-kite-line bg-kite-soft py-2.5 pl-11 pr-4 text-sm text-kite-ink outline-none transition placeholder:text-kite-faint focus:border-kite-blue focus:bg-white focus:ring-4 focus:ring-kite-blue-wash disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[min(70vh,520px)] overflow-y-auto rounded-2xl border border-kite-line bg-white p-2 shadow-[0_24px_60px_-24px_rgba(46,51,56,0.35)]">
          {trimmedQuery.length < 2 ? (
            <SearchMessage text="Type at least 2 characters to search." />
          ) : isLoading ? (
            <SearchMessage text="Searching..." />
          ) : error ? (
            <SearchMessage text={error} error />
          ) : !hasResults ? (
            <SearchMessage text={`No results found for “${trimmedQuery}”.`} />
          ) : (
            <>
              {results.projects.length > 0 && (
                <ResultGroup title="Projects">
                  {results.projects.map((project) => (
                    <ResultButton
                      key={project.id}
                      title={project.name}
                      description={project.description}
                      meta={formatStatus(project.status)}
                      onClick={() => goTo(`/projects/${project.id}`)}
                    />
                  ))}
                </ResultGroup>
              )}

              {results.tasks.length > 0 && (
                <ResultGroup title="Tasks">
                  {results.tasks.map((task) => (
                    <ResultButton
                      key={task.id}
                      title={task.title}
                      description={task.description}
                      meta={`${task.project.name} · ${formatStatus(task.status)}`}
                      onClick={() =>
                        goTo(`/projects/${task.projectId}/tasks/${task.id}`)
                      }
                    />
                  ))}
                </ResultGroup>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SearchMessage({
  text,
  error = false,
}: {
  text: string;
  error?: boolean;
}) {
  return (
    <p
      role={error ? "alert" : "status"}
      className={`px-4 py-6 text-center text-sm ${
        error ? "text-red-600" : "text-kite-muted"
      }`}
    >
      {text}
    </p>
  );
}

function ResultGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-1">
      <h2 className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-kite-faint">
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}

function ResultButton({
  title,
  description,
  meta,
  onClick,
}: {
  title: string;
  description: string | null;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded-xl px-3 py-2.5 text-left transition hover:bg-kite-soft focus:bg-kite-soft focus:outline-none"
    >
      <span className="block truncate text-sm font-medium text-kite-ink">
        {title}
      </span>
      <span className="mt-0.5 block truncate text-xs text-kite-muted">
        {description || meta}
      </span>
      {description && (
        <span className="mt-1 block truncate text-[11px] text-kite-faint">
          {meta}
        </span>
      )}
    </button>
  );
}

export default GlobalSearch;
