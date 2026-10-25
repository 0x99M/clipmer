import { VERSION } from "@/lib/release";

/**
 * Railway's healthcheck target, and the quickest way to see which build is
 * actually serving.
 *
 * With a healthcheck path configured, Railway polls this until it gets a 2xx
 * before making the new deployment active and the previous one inactive — that
 * overlap is the whole zero-downtime guarantee. Without it the cutover happens
 * when the container starts, which is a second or two before `next start` is
 * answering requests.
 *
 * Route Handlers are uncached by default in Next 16, so this reports the live
 * process rather than a build-time snapshot. Keep it dependency-free: anything
 * it touches becomes something that can fail a deploy.
 */
export function GET() {
  return Response.json(
    {
      status: "ok",
      version: VERSION,
      // Set by Railway on git deploys; absent locally.
      commit: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
