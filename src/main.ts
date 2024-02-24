import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { fileConfig, userConfig } from "./config";
import { Bootstrap } from "./core/bootstrap";
import { Config } from "./utils/config";

(async () => {
  const {
    _: [folderPathUploadTo],
    parallelUploads
  } = await yargs(hideBin(process.argv))
    .scriptName("gdrive")
    .demandCommand(1, "Please provide a folder where to upload.")
    .option("parallelUploads", {
      alias: "p",
      type: "number",
      describe: "Number of parallel uploads",
      default: 10,
      demandOption: true
    })
    .parse();

  const bootstrap = new Bootstrap();
  await bootstrap.bootstrap({
    folderPathUploadTo: folderPathUploadTo.toString(),
    parallelUploads
  });
})();

const saveConfigs = () => {
  Config.saveConfigs(userConfig, fileConfig);
  process.exit();
};

process.on("SIGHUP", saveConfigs);
process.on("SIGINT", saveConfigs);
process.on("SIGTERM", saveConfigs);
process.on("SIGBREAK", saveConfigs);
process.on("beforeExit", saveConfigs);
