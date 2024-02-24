import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";

import { userConfig } from "../config";
import { env } from "../env";
import { open } from "../utils/open";
import { Server } from "./server";

export class GoogleExtensions {
  protected readonly _server: Server;
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
    const previousSavedToken = userConfig.get("googleToken");

    if (previousSavedToken) {
      const { accessToken, refreshToken, expiryDate } = previousSavedToken;

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
      } catch (e) {
        console.log("Error", e);
      }
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
        res.setHeader("Content-Type", "text/html");
        res.write("Authenticated! You can close this tab now.");
        res.write("<script>setTimeout(() => window.close(), 1000);</script>");
        res.end();
        resolve();
      });
    });

    this._server.close();

    if (!code) {
      throw new Error("Failed to authenticate");
    }

    const { tokens } = await this._oauth2Client.getToken(code);
    this._oauth2Client.setCredentials(tokens);
    userConfig.set("googleToken", {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date
    });
  }
}
