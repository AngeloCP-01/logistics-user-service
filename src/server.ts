// Temporary boot smoke. Replaced by the full composition root in task G7.
const arg = process.argv[2];
if (arg === "--healthcheck") {
  console.log(JSON.stringify({ ok: true, service: "user-service" }));
  process.exit(0);
}
console.log("user-service: implementation pending");
process.exit(0);
