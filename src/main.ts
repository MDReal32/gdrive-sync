import { join } from "node:path";

import { GoogleUploader } from "./utils/google-uploader";
import { Ignore } from "./utils/ignore";
import { CallbackOptions, Sync } from "./utils/sync";

(async () => {
  const folderPathUploadTo = process.argv[2];
  const ignore = new Ignore();
  const sync = new Sync(process.cwd(), ignore);
  const uploader = new GoogleUploader();
  await uploader.authenticate();

  const uploadFile = async ({ name, fullPath }: CallbackOptions) => {
    console.log(`Uploading ${name}...`);
    await uploader.upload(fullPath, join(folderPathUploadTo, name));
    console.log(`Uploaded ${name}`);
  };

  await sync.sync(uploadFile);
  await sync.listenToChanges(uploadFile);
})();
