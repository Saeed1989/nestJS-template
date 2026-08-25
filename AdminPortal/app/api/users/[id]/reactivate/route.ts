import { forward } from "@/lib/upstream";
import { requireOrigin } from "@/lib/guards";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const originError = requireOrigin(request);
  if (originError) return originError;
  const { id } = await params;
  return forward(request, `/admin/users/${id}/reactivate`);
}
