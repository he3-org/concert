const args = process.argv.slice(2);
const command = args[0];

if (command === "--version" || command === "-V") {
  // Will be replaced with dynamic version reading
  console.log("0.1.0");
  process.exit(0);
}

if (command === "--help" || command === "-h" || !command) {
  console.log(`Usage: concert <command>

Commands:
  init     Initialize Concert in a repository
  update   Update Concert files to latest version
  push     Push current branch to origin

Options:
  --help, -h       Show this help message
  --version, -V    Show version number`);
  process.exit(0);
}

console.error(`Error: unknown command "${command}"

  Available commands: init, update, push

  Run "concert --help" for usage information.`);
process.exit(2);
