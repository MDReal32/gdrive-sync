import { createReadStream } from "node:fs";
import { basename, dirname, join } from "node:path";

import { drive_v3, google } from "googleapis";

import { cacheConfig } from "../config";
import { getMimeType } from "../utils/get-mime-type";
import { GoogleExtensions } from "./google-extensions";

export class GoogleDrive extends GoogleExtensions {
  protected readonly _drive: drive_v3.Drive;

  constructor() {
    super();

    this._drive = google.drive({ version: "v3", auth: this._oauth2Client });
  }

  protected async getFileById(id: string) {
    const res = await this.cache(`file::id::${id}`, () =>
      this._drive.files.get({
        fileId: id,
        fields: "id, name, mimeType"
      })
    );
    return res.data;
  }

  protected getFileByName(path: string, parentId?: string) {
    const name = basename(path);
    return this.cache(`file::${path}`, () =>
      this._drive.files.list({
        q: `name='${name}' and trashed=false and '${parentId ? parentId : "root"}' in parents`,
        fields: "files(id, name, size, mimeType)"
      })
    );
  }

  protected async getFolderByName(path: string, parentId?: string) {
    const base = dirname(path);
    const name = basename(path);

    if (base !== ".") {
      parentId = await this.getFolderByName(base, parentId);
    }

    return this.cache(`folder::${path}`, async () => {
      const res = await this._drive.files.list({
        q: `name='${name}' and trashed=false and mimeType='application/vnd.google-apps.folder' and '${parentId ? parentId : "root"}' in parents`,
        fields: "files(id)"
      });
      return res.data.files?.[0]?.id;
    });
  }

  protected async createFolderIfNotExistsRecursively(name: string, parentId?: string) {
    const folderLevels = name.split("/");
    let folderId = parentId;
    let folderConstructedPath = "";

    for (const folder of folderLevels) {
      if (!folder) continue;
      folderConstructedPath = join(folderConstructedPath, folder);
      const tmpFolderId = await this.getFolderByName(folderConstructedPath, folderId);

      if (tmpFolderId) {
        folderId = tmpFolderId;
      } else {
        const res = await this._drive.files.create({
          requestBody: {
            name: folder,
            mimeType: "application/vnd.google-apps.folder",
            parents: folderId ? [folderId] : undefined
          },
          fields: "id"
        });
        folderId = res.data.id;
        await this.cache(`folder::${folderConstructedPath}`, async () => folderId);
      }
    }

    return folderId;
  }

  protected async uploadFile(file: string, destination: string) {
    const destinationDirectory = dirname(destination);
    const folderId = await this.createFolderIfNotExistsRecursively(destinationDirectory);

    const filename = basename(destination);
    const existingFile = await this.getFileByName(filename, folderId);
    const f = existingFile.data.files?.[0];

    if (f?.id) {
      await this._drive.files.update({
        fileId: existingFile.data.files[0].id!,
        media: { mimeType: getMimeType(file), body: createReadStream(file) }
      });
    } else {
      await this._drive.files.create({
        requestBody: {
          name: filename,
          mimeType: getMimeType(file),
          parents: folderId ? [folderId] : undefined
        },
        media: { body: createReadStream(file) }
      });
    }
  }

  private async cache<R>(key: string, cb: () => Promise<R>): Promise<R> {
    if (cacheConfig.has(key)) {
      return cacheConfig.get(key);
    }

    const data = await cb();
    cacheConfig.set(key, data);
    return data;
  }
}
