export type StorageType = "local" | "database";

export const storageConfig: {
  type: StorageType;
} = {
  type:
    typeof window !== "undefined" &&
    window.localStorage.getItem("MANAGEME_STORAGE_TYPE") === "local"
      ? "local"
      : import.meta.env.VITE_STORAGE_TYPE === "database"
        ? "database"
        : "local",
};
