import { execSync } from "child_process";

export const open = (url: string) => {
  switch (process.platform) {
    case "darwin":
      execSync(`open "${url}"`);
      break;
    case "win32":
      execSync(`start "${url}"`);
      break;
    case "linux":
      execSync(`xdg-open "${url}"`);
      break;
  }
};
