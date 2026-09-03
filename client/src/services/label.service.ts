import { apiFetch } from "../lib/api";

export type ApiLabel = { id: string; name: string; color: string };
type LabelsResponse = { success: true; data: { labels: ApiLabel[] } };
type LabelResponse = { success: true; data: { label: ApiLabel } };

export const labelService = {
  getAll: (workspaceId: string) => apiFetch<LabelsResponse>(`/workspaces/${workspaceId}/labels`),
  create: (workspaceId: string, data: { name: string; color: string }) =>
    apiFetch<LabelResponse>(`/workspaces/${workspaceId}/labels`, { method: "POST", body: data }),
  remove: (workspaceId: string, labelId: string) =>
    apiFetch<{ success: true; message: string }>(`/workspaces/${workspaceId}/labels/${labelId}`, { method: "DELETE" }),
};
