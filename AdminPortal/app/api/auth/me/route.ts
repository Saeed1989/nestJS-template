import { forward } from "@/lib/upstream";

export async function GET(request: Request) {
  return forward(request, "/auth/me");
}
