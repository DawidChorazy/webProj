export type StorageType = "local" | "database";

export const storageConfig: {
  type: StorageType;
} = {
  type: import.meta.env.VITE_STORAGE_TYPE === "database" ? "database" : "local",
};
