import { Dirent, readdirSync } from "node:fs";

import { Ignore } from "./ignore";

export interface CallbackOptions {
  name: string;
  fullPath: string;
  dirent: Dirent;
}

type Callback = (options: CallbackOptions) => void | Promise<void>;

export interface SyncPlugin {
  onAddFile: Callback;
  onRemoveFile: Callback;
  onChangeFile: Callback;
}

export class Sync {
  private readonly _plugins: SyncPlugin[] = [];

  constructor(
    private readonly _syncDir: string,
    private readonly _ignore: Ignore
  ) {}

  use$(plugin: SyncPlugin) {
    this._plugins.push(plugin);
  }

  async sync() {
    await this.addFiles(this._syncDir);
  }

  async listenToChanges() {}

  private async addFiles(dir: string, root = dir) {
    const files = readdirSync(dir, { withFileTypes: true });

    const promises = files.map(async file => {
      const filePath = `${dir}/${file.name}`;

      if (!this._ignore.isIgnored(filePath)) {
        !this._ignore.isIgnored(`${filePath}/`) &&
          this.handlePlugins("onAddFile", {
            name: filePath.replace(root, "").replace(/^\//, "").replace(/\\/g, "/"),
            fullPath: filePath,
            dirent: file
          });

        if (file.isDirectory()) {
          await this.addFiles(filePath, root);
        }
      }
    });

    await Promise.all(promises).catch(console.error);
  }

  private handlePlugins(method: keyof SyncPlugin, data: CallbackOptions) {
    this._plugins.forEach(plugin => {
      plugin[method](data);
    });
  }
}
