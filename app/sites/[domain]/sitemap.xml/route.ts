import { getPublicVehicles } from "@/lib/public-vehicle";
import { getTenantOrigin } from "@/lib/site-url";
import { getTenantByDomain } from "@/lib/tenant";

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET(_request: Request, { params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const tenant = await getTenantByDomain(domain);
  if (!tenant) return new Response("Not found", { status: 404 });

  const origin = getTenantOrigin(tenant);
  const vehicles = await getPublicVehicles(tenant.id);
  const urls = [`${origin}/`, ...vehicles.map((vehicle) => `${origin}/auto/${vehicle.id}`)];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`)
    .join("\n")}\n</urlset>\n`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
