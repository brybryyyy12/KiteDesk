import {
  apiFetch,
} from "../lib/api";

export type SearchProjectResult = {
  id: string;
  name: string;
  description: string | null;
  status: string;
};

export type SearchTaskResult = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  type: string;
  project: {
    name: string;
  };
};

export type SearchResponse = {
  success: true;
  data: {
    query: string;
    projects: SearchProjectResult[];
    tasks: SearchTaskResult[];
  };
};

export const searchService = {
  search(
    workspaceId: string,
    query: string,
    signal?: AbortSignal
  ) {
    const params =
      new URLSearchParams({
        q: query.trim(),
      });

    return apiFetch<SearchResponse>(
      `/workspaces/${workspaceId}/search?${params.toString()}`,
      { signal }
    );
  },
};
