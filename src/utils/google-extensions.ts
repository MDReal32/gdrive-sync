import { existsSync, writeFileSync } from "node:fs";

import { readFileSync } from "fs";

import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";

import { env } from "../env";
import { Crypto } from "./crypto";
import { Server } from "./server";

export class GoogleExtensions {
  protected readonly _server: Server;
  protected readonly _crypto = new Crypto();
  protected readonly _tokenPath = `${env.HOME}/.google-tokens`;
  protected readonly _oauth2Client: OAuth2Client;
  protected readonly _serverPort = 37867;

  constructor() {
    this._oauth2Client = new google.auth.OAuth2(
      env.GOOGLE_CREDENTIALS.web.client_id,
      env.GOOGLE_CREDENTIALS.web.client_secret,
      `http://localhost:${this._serverPort}`
    );

    this._server = new Server();
  }

  async authenticate() {
    if (existsSync(this._tokenPath)) {
      const tokens = this._crypto.decrypt(readFileSync(this._tokenPath, "utf-8"));
      const { accessToken, refreshToken, expiryDate } = this.transformToken(
        this._crypto.decrypt(tokens)
      );

      this._oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
        expiry_date: expiryDate
      });

      if (expiryDate < Date.now()) {
        return;
      }

      try {
        const { credentials } = await this._oauth2Client.refreshAccessToken();
        this._oauth2Client.setCredentials(credentials);
        return;
      } catch {}
    }

    const authUrl = this._oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/drive"]
    });
    console.log("Please authenticate by visiting the following URL: ", authUrl);
    open(authUrl);
    this._server.listen(this._serverPort);

    let code: string;

    await new Promise<void>((resolve, reject) => {
      this._server.onRequest(async (req, res) => {
        code = new URLSearchParams(req.url?.split("?")[1] ?? "").get("code");
        res.end("Authenticated! You can close this tab now.");
        resolve();
      });
    });

    this._server.close();

    if (!code) {
      throw new Error("Failed to authenticate");
    }

    const { tokens } = await this._oauth2Client.getToken(code);

    const encryptedTokens = this._crypto.encrypt(this.transformToToken(tokens));
    writeFileSync(this._tokenPath, encryptedTokens);
  }

  protected transformToToken(tokens: OAuth2Client["credentials"]) {
    const dateAsAlphabet = tokens.expiry_date
      .toString()
      .split("")
      .map(char => String.fromCharCode(char.charCodeAt(0) + 26))
      .join("")
      .toLowerCase();

    return `at/${tokens.access_token}/rt/${tokens.refresh_token}/et${dateAsAlphabet}`;
  }

  protected transformToken(tokens: string) {
    const [, accessToken, refreshToken, expiryDate] = tokens.match(/^at\/(.+)\/rt\/(.+)\/et(.+)$/);

    return {
      accessToken,
      refreshToken,
      expiryDate: +expiryDate
        .toUpperCase()
        .split("")
        .map(char => String.fromCharCode(char.charCodeAt(0) - 26))
        .join("")
    };
  }
}
