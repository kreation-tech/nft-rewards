/* eslint-disable no-process-exit */
import copy from "recursive-copy";

async function main() {
  await copy("contracts", "dist/contracts", { overwrite: true, results: true });
  await copy("src/types", "dist/types", { overwrite: true, filter: ["**/*.d.ts"], results: true });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
