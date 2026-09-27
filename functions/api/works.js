function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60, s-maxage=120",
      "x-content-type-options": "nosniff",
    },
  });
}

export async function onRequestGet({ request, env }) {
  if (!env.MICROCMS_SERVICE_ID || !env.MICROCMS_API_KEY) {
    return json({ contents: [], totalCount: 0, offset: 0, configured: false });
  }

  const requestUrl = new URL(request.url);
  const offsetValue = Number.parseInt(requestUrl.searchParams.get("offset") || "0", 10);
  const offset = Number.isFinite(offsetValue) ? Math.max(0, Math.min(offsetValue, 10000)) : 0;
  const cmsUrl = new URL(`https://${env.MICROCMS_SERVICE_ID}.microcms.io/api/v1/works`);
  cmsUrl.searchParams.set("limit", "20");
  cmsUrl.searchParams.set("offset", String(offset));
  cmsUrl.searchParams.set("orders", "-createdAt");
  cmsUrl.searchParams.set("fields", "id,title,post_url,creator_name,creator_url,category,comment,createdAt,publishedAt");

  try {
    const cmsResponse = await fetch(cmsUrl, {
      headers: { "X-MICROCMS-API-KEY": env.MICROCMS_API_KEY, Accept: "application/json" },
    });
    if (!cmsResponse.ok) {
      return json({ message: "作品を読み込めませんでした。" }, 502);
    }
    const result = await cmsResponse.json();
    const contents = Array.isArray(result.contents) ? result.contents : [];
    return json({
      contents,
      totalCount: Number(result.totalCount || 0),
      offset,
      configured: true,
    });
  } catch {
    return json({ message: "作品を読み込めませんでした。" }, 502);
  }
}
