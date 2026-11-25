// A problem worth surfacing that shouldn't stop the run: a GitHub Actions
// warning annotation in CI, stderr locally.
export function warn(title: string, message: string): void {
  if (process.env.GITHUB_ACTIONS) {
    // Annotations are one line; the rest of the message stays in the log.
    const [first = "", ...rest] = message.split("\n");
    console.log(`::warning title=${title}::${first}`);
    if (rest.length > 0) console.log(rest.join("\n"));
  } else {
    console.error(`${title}: ${message}`);
  }
}
