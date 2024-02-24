import { IncomingMessage, RequestListener, ServerResponse, createServer } from "node:http";

export class Server {
  private readonly _server: ReturnType<typeof createServer>;
  private readonly _endpoints: Map<string, ((req: any, res: any) => void)[]> = new Map();

  constructor() {
    this._server = createServer();
  }

  onRequest(callback: RequestListener<typeof IncomingMessage, typeof ServerResponse>) {
    this._server.on("request", callback);
  }

  listen(port: number) {
    this._server.listen(port);
  }

  close() {
    this._server.close();
  }
}
