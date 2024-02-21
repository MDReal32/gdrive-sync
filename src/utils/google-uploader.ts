import { GoogleDrive } from "./google-drive";

export class GoogleUploader extends GoogleDrive {
  async upload(file: string, destination: string) {
    await this.uploadFile(file, destination);
  }
}
