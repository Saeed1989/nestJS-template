import { forward } from "@/lib/upstream";
import { requireOrigin } from "@/lib/guards";

export async function GET(request: Request) {
  const { search } = new URL(request.url);
  return forward(request, `/admin/users${search}`);
}

export async function POST(request: Request) {
  const originError = requireOrigin(request);
  if (originError) return originError;
  return forward(request, "/admin/users");
}
