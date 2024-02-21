import { createReadStream, statSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";

import { drive_v3, google } from "googleapis";

import { GoogleExtensions } from "./google-extensions";

export class GoogleDrive extends GoogleExtensions {
  protected readonly _drive: drive_v3.Drive;
  protected readonly _cache: Map<string, any> = new Map();

  constructor() {
    super();

    this._drive = google.drive({ version: "v3", auth: this._oauth2Client });
  }

  protected getFileById(id: string) {
    return this.cache(`file::id::${id}`, () =>
      this._drive.files.get({ fileId: id, fields: "id, name, mimeType" })
    );
  }

  protected getFileByName(path: string, parentId?: string) {
    const name = basename(path);
    return this.cache(`file::${path}`, () =>
      this._drive.files.list({
        q: `name='${name}' and trashed=false and '${parentId ? parentId : "root"}' in parents`,
        fields: "files(id, name, mimeType)"
      })
    );
  }

  protected async getFolderByName(path: string, parentId?: string) {
    const name = basename(path);
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
        this._cache.set(`folder::${folderConstructedPath}`, folderId);
      }


    }


    return folderId;
  }

  protected async uploadFile(file: string, destination: string) {
    const destinationDirectory = dirname(destination);
    const folderId = await this.createFolderIfNotExistsRecursively(destinationDirectory);

    const filename = basename(destination);
    const existingFile = await this.getFileByName(filename, folderId);

    if (existingFile.data.files?.[0]?.id) {
      await this._drive.files.update({
        fileId: existingFile.data.files[0].id!,
        media: { mimeType: this.getMimeType(file), body: createReadStream(file) }
      });
    } else {
      await this._drive.files.create({
        requestBody: {
          name: filename,
          mimeType: this.getMimeType(file),
          parents: folderId ? [folderId] : undefined
        },
        media: { body: createReadStream(file) }
      });
    }
  }

  private getMimeType(file: string) {
    const fileStats = statSync(file);
    if (fileStats.isDirectory()) {
      return "application/vnd.google-apps.folder";
    }

    switch (extname(file)) {
      case ".zip":
        return "application/zip";
      case ".png":
        return "image/png";
      case ".jpg":
      case ".jpeg":
        return "image/jpeg";
      case ".gif":
        return "image/gif";
      case ".pdf":
        return "application/pdf";
      case ".doc":
        return "application/msword";
      case ".docx":
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      case ".xls":
        return "application/vnd.ms-excel";
      case ".xlsx":
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      case ".ppt":
        return "application/vnd.ms-powerpoint";
      case ".pptx":
        return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
      default:
        return "application/octet-stream";
    }
  }

  private async cache<R>(key: string, cb: () => Promise<R>): Promise<R> {
    if (this._cache.has(key)) {
      return this._cache.get(key);
    }

    return cb().then(data => {
      this._cache.set(key, data);
      return data;
    });
  }
}
