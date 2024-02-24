import { rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { mkdirSync, readFileSync } from "fs";

import { env } from "../env";

export class Config<T> {
  private readonly _configFile: string;
  private _config: T = {} as T;

  constructor(configFile: string) {
    this._configFile = resolve(env.HOME, configFile);
  }

  static loadConfigs(...configs: Config<any>[]) {
    configs.forEach(config => config.load());
  }

  static saveConfigs(...configs: Config<any>[]) {
    configs.forEach(config => config.save());
  }

  set<TKey extends keyof T>(key: TKey, value: T[TKey]) {
    this._config[key] = value;
    this.save();
  }

  setIfNotExists<TKey extends keyof T>(key: TKey, value: T[TKey]) {
    if ([null, undefined].includes(this.get(key))) {
      this.set(key, value);
    }
  }

  get<TKey extends keyof T>(key: TKey): T[TKey] {
    return this._config[key];
  }

  has<TKey extends keyof T>(key: TKey): boolean {
    return this._config[key] !== undefined;
  }

  load() {
    try {
      const content = readFileSync(this._configFile, "utf-8");
      if (!content) rmSync(this._configFile);
      this._config = JSON.parse(content);
    } catch (e) {
      this._config = {} as T;
    }
  }

  save() {
    const content = JSON.stringify(this._config);
    mkdirSync(dirname(this._configFile), { recursive: true });
    writeFileSync(this._configFile, content);
  }
}
