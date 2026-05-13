import { storageConfig } from "../config/storageConfig";
import { LocalStorageStorage } from "./LocalStorageStorage";
import { ApiStorage } from "./ApiStorage";

export function storageFactory() {
  return storageConfig.type === "database"
    ? new ApiStorage()
    : new LocalStorageStorage();
}
