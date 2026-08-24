// CSRF mitigation for mutating Route Handlers, on top of SameSite=Strict.
// Reject only when Origin is present and wrong — same-origin requests from
// fetch() don't always send it, and SameSite=Strict already blocks cross-site
// cookie delivery, so absence isn't itself suspicious.
export function requireOrigin(request: Request): Response | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  if (origin !== process.env.APP_ORIGIN) {
    return Response.json(
      { error: { message: "Origin does not match this application", statusCode: 403 } },
      { status: 403 },
    );
  }

  return null;
}
