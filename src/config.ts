import { Config } from "./utils/config";

interface UserConfig {
  googleToken: { accessToken: string; refreshToken: string; expiryDate: number };
}
export const userConfig = new Config<UserConfig>(".sync-config/user.json");

interface FileConfig {
  fileList: Record<string, { path: string; mimeType: string; parentId: string; id: string }>;
  isFirstSyncedBefore: boolean;
}
export const fileConfig = new Config<FileConfig>(".sync-config/files.json");

type Cache = Record<string, any>;
export const cacheConfig = new Config<Cache>(".sync-config/cache.json");
