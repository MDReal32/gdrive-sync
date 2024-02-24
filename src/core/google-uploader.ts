import { dirname, join } from "node:path";

import { DependentList } from "./dependency-list";
import { GoogleDrive } from "./google-drive";
import { CallbackOptions, SyncPlugin } from "./sync";

export class GoogleUploader extends GoogleDrive implements SyncPlugin {
  private readonly dependentList = new DependentList();

  constructor(private readonly _basePath: string) {
    super();
  }

  onAddFile(file: CallbackOptions) {
    const isDirectory = file.dirent.isDirectory();

    const task = async () => {
      if (isDirectory) {
        console.log("Creating folder", file.name);
        await this.createFolderIfNotExistsRecursively(join(this._basePath, file.name));
      } else {
        console.log("Uploading file", file.name);
        await this.uploadFile(file.fullPath, join(this._basePath, file.name));
      }
    };

    const parentDir = dirname(file.name);
    this.dependentList.addTask(file.name, task, parentDir === "." ? [] : [dirname(file.name)]);
  }

  onChangeFile(file: CallbackOptions) {}

  onRemoveFile(file: CallbackOptions) {}

  async execute(parallel = 5) {
    await this.dependentList.run(parallel);
  }
}
