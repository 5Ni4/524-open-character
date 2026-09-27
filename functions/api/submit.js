const ALLOWED_CATEGORIES = new Set(["イラスト・画像", "設定・アイデア", "グッズ", "写真・実物", "その他"]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function textValue(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function normalizeXPostUrl(value) {
  if (typeof value !== "string" || value.length > 500) return "";
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || !new Set(["x.com", "www.x.com", "twitter.com", "www.twitter.com"]).has(host)) return "";
    const match = url.pathname.match(/^\/(?:([^/]+\/status\/\d+)|(i\/status\/\d+))/i);
    if (!match) return "";
    return `https://x.com/${match[1] || match[2]}`;
  } catch {
    return "";
  }
}

function normalizeXProfileUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || !new Set(["x.com", "www.x.com", "twitter.com", "www.twitter.com"]).has(host)) return "invalid";
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length !== 1 || segments[0].toLowerCase() === "i") return "invalid";
    return `https://x.com/${segments[0]}`;
  } catch {
    return "invalid";
  }
}

async function verifyTurnstile(token, request, secret) {
  const body = new URLSearchParams({ secret, response: token });
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) body.set("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) return false;
  const result = await response.json().catch(() => ({}));
  return result.success === true;
}

export async function onRequestPost({ request, env }) {
  if (!env.MICROCMS_SERVICE_ID || !env.MICROCMS_API_KEY || !env.TURNSTILE_SITE_KEY || !env.TURNSTILE_SECRET_KEY) {
    return json({ message: "投稿受付の準備中です。" }, 503);
  }

  const origin = request.headers.get("Origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return json({ message: "このページから送信してください。" }, 403);
  }
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return json({ message: "送信内容を読み取れませんでした。" }, 415);
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return json({ message: "送信内容を読み取れませんでした。" }, 400);
  }

  // Bots that fill the visually hidden field receive a success response without creating content.
  if (textValue(input.website, 200)) return json({ ok: true });

  const postUrl = normalizeXPostUrl(input.postUrl);
  const creatorName = textValue(input.creatorName, 80);
  const creatorUrl = normalizeXProfileUrl(textValue(input.creatorUrl, 300));
  const category = textValue(input.category, 40);
  const comment = textValue(input.comment, 300);
  const turnstileToken = textValue(input.turnstileToken, 4096);

  if (!postUrl) return json({ message: "公開中のX投稿URLを入力してください。" }, 400);
  if (creatorUrl === "invalid") return json({ message: "XプロフィールURLの形式を確認してください。" }, 400);
  if (!ALLOWED_CATEGORIES.has(category)) return json({ message: "作品の種類を選んでください。" }, 400);
  if (input.consent !== true) return json({ message: "掲載についての確認にチェックしてください。" }, 400);
  if (!turnstileToken || !(await verifyTurnstile(turnstileToken, request, env.TURNSTILE_SECRET_KEY))) {
    return json({ message: "スパム防止の確認をやり直してください。" }, 400);
  }

  const title = creatorName ? `${creatorName}さんの作品` : "524の創作";
  const payload = {
    title,
    post_url: postUrl,
    creator_name: creatorName,
    creator_url: creatorUrl,
    category,
    comment,
    permission_confirmed: true,
  };
  const cmsUrl = `https://${env.MICROCMS_SERVICE_ID}.microcms.io/api/v1/works?status=draft`;

  try {
    const cmsResponse = await fetch(cmsUrl, {
      method: "POST",
      headers: {
        "X-MICROCMS-API-KEY": env.MICROCMS_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!cmsResponse.ok) return json({ message: "投稿を登録できませんでした。入力内容をご確認ください。" }, 502);
    return json({ ok: true }, 201);
  } catch {
    return json({ message: "投稿を送信できませんでした。時間をおいて再度お試しください。" }, 502);
  }
}
