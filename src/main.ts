import { fileConfig, userConfig } from "./config";
import { GoogleUploader } from "./core/google-uploader";
import { Ignore } from "./core/ignore";
import { Sync } from "./core/sync";
import { Config } from "./utils/config";

(async () => {
  Config.loadConfigs(userConfig, fileConfig);

  const folderPathUploadTo = process.argv[2];

  const ignore = new Ignore();
  const sync = new Sync(process.cwd(), ignore);
  const uploader = new GoogleUploader(folderPathUploadTo);
  await uploader.authenticate();
  sync.use$(uploader);

  await sync.sync();
  await sync.listenToChanges();

  await uploader.execute(13);
})();

const saveConfigs = () => {
  Config.saveConfigs(userConfig, fileConfig);
  process.exit();
};

process.on("SIGHUP", saveConfigs);
process.on("SIGINT", saveConfigs);
process.on("SIGTERM", saveConfigs);
process.on("SIGBREAK", saveConfigs);
process.on("beforeExit", saveConfigs);
