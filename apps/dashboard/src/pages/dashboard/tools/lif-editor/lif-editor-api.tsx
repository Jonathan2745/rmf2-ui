import type { LifDocument } from './lif-editor-types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchLifLayout(): Promise<LifDocument> {
  return request<LifDocument>('/api/lif-editor/layout');
}

export async function saveLifLayout(layout: LifDocument): Promise<LifDocument> {
  return request<LifDocument>('/api/lif-editor/layout', {
    method: 'PUT',
    body: JSON.stringify(layout),
  });
}

export async function importLifLayout(file: File): Promise<LifDocument> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/lif-editor/import`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Import failed: ${response.status}`);
  }

  return response.json() as Promise<LifDocument>;
}

export async function exportLifLayout(layout: LifDocument): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/api/lif-editor/export`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(layout),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Export failed: ${response.status}`);
  }

  return response.blob();
}
