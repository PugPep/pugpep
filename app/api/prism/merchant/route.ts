import { handleMerchantRequest } from "../../../../lib/prism-merchant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleMerchantRequest(request);
}
