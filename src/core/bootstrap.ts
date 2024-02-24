import { Config } from "../utils/config";
import { fileConfig, userConfig } from "../config";
import { Ignore } from "./ignore";
import { Sync } from "./sync";
import { GoogleUploader } from "./google-uploader";

interface Options {
  folderPathUploadTo: string;
  parallelUploads?: number;
}

export class Bootstrap {
  async bootstrap(options: Options) {
    Config.loadConfigs(userConfig, fileConfig);


  const ignore = new Ignore();
  const sync = new Sync(process.cwd(), ignore);
  const uploader = new GoogleUploader(options.folderPathUploadTo);
  await uploader.authenticate();
  sync.use$(uploader);

  await sync.sync();
  await sync.listenToChanges();

  await uploader.execute(options.parallelUploads || 10);
  }
}