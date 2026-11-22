import type { MetadataRoute } from "next";

/** robots.txt del sitio principal y del panel. Cada agencia tiene el suyo (ver app/sites/[domain]/robots.txt). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/admin", "/onboarding", "/api/", "/login", "/register", "/forgot-password", "/reset-password"],
    },
  };
}
