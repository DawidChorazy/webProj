import { storageConfig } from "../config/storageConfig";
import { LocalStorageStorage } from "./LocalStorageStorage";
import { ApiStorage } from "./ApiStorage";

export const storage =
  storageConfig.type === "api"
    ? new ApiStorage()
    : new LocalStorageStorage();