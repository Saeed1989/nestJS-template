import { forward } from "@/lib/upstream";

export async function GET(request: Request) {
  const { search } = new URL(request.url);
  return forward(request, `/admin/audit${search}`);
}
