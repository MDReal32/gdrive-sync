import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { readFileSync } from "fs";

import * as parser from "@gerhobbelt/gitignore-parser";

export class Ignore {
  private readonly hasIgnoreFile: boolean;
  private readonly _parser: any;

  constructor(private readonly _ignoreFile?: string) {
    const ignoreFile = existsSync(this._ignoreFile)
      ? this._ignoreFile
      : existsSync(resolve(".syncignore"))
        ? resolve(".syncignore")
        : resolve(".gitignore");
    this.hasIgnoreFile = existsSync(ignoreFile);
    this._parser = this.hasIgnoreFile ? parser.compile(readFileSync(ignoreFile, "utf-8")) : null;
  }

  isIgnored(file: string) {
    return this.hasIgnoreFile && this._parser.denies(file);
  }
}
