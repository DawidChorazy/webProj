import type { IStorage } from "./IStorage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

function storageUrl(key: string) {
  return `${API_BASE_URL}/api/storage/${encodeURIComponent(key)}`;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Storage API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export class ApiStorage implements IStorage {
  async get<T>(key: string): Promise<T | null> {
    const response = await fetch(storageUrl(key), {
      credentials: "include",
      cache: "no-store",
    });

    const data = await parseJsonResponse<{ value: T | null }>(response);
    return data.value;
  }

  async set<T>(key: string, value: T): Promise<void> {
    const response = await fetch(storageUrl(key), {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value }),
    });

    await parseJsonResponse<{ ok: boolean }>(response);
  }

  async remove(key: string): Promise<void> {
    const response = await fetch(storageUrl(key), {
      method: "DELETE",
      credentials: "include",
    });

    await parseJsonResponse<{ ok: boolean }>(response);
  }
}
