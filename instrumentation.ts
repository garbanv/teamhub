export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { startEmailWorker } = await import("./lib/email-worker");
  startEmailWorker();
}
