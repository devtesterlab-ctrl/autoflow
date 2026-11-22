import { getTenantOrigin } from "@/lib/site-url";
import { getTenantByDomain } from "@/lib/tenant";

export async function GET(_request: Request, { params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const tenant = await getTenantByDomain(domain);
  if (!tenant) return new Response("Not found", { status: 404 });

  const body = `User-agent: *\nAllow: /\n\nSitemap: ${getTenantOrigin(tenant)}/sitemap.xml\n`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
