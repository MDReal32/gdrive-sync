import { Dirent, createWriteStream, readdirSync } from "node:fs";

import { Ignore } from "./ignore";

export interface CallbackOptions {
  name: string;
  fullPath: string;
  dirent: Dirent;
}

type Callback = (options: CallbackOptions) => void | Promise<void>;

export class Sync {
  constructor(
    private readonly _syncDir: string,
    private readonly _ignore: Ignore
  ) {}

  async sync(cb: Callback) {
    await this.addFiles(this._syncDir, this._syncDir, cb);
    return;
  }

  async listenToChanges(cb: Callback) {}

  private async addFiles(dir: string, root = dir, cb: Callback) {
    const files = readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
      const filePath = `${dir}/${file.name}`;

      if (this._ignore.isIgnored(filePath)) {
        continue;
      }

      if (file.isDirectory()) {
        await this.addFiles(filePath, root, cb);
      } else {
        await cb({
          name: filePath.replace(root, "").replace(/^\//, "").replace(/\\/g, "/"),
          fullPath: filePath,
          dirent: file
        });
      }
    }

    return;
  }
}
