export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const COOKIE_NAME = "kb_session";
    const MAX_AGE_SECONDS = 3600;

    function uint8ToBase64(bytes: Uint8Array): string {
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }

    async function sign(value: string, secret: string): Promise<string> {
      const key = await crypto.subtle.importKey(
        "raw", new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
      );
      const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
      return uint8ToBase64(new Uint8Array(sig));
    }

    function getCookie(request: Request, name: string): string | null {
      const cookieHeader = request.headers.get("Cookie") || "";
      const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
      return match ? decodeURIComponent(match[1]) : null;
    }

    function loginPage(error?: string): Response {
      const errorMsg = error ? `<p style="color:#ff6b6b;margin-bottom:12px;">${error}</p>` : "";
      return new Response(`<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Вход — Knowledge Base</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#0a0e12;color:#e8f7fc;font-family:'JetBrains Mono',monospace;display:flex;align-items:center;justify-content:center;min-height:100vh}
  .login-box{background:#0d1318;border:1px solid #1a2830;border-radius:8px;padding:32px;width:100%;max-width:380px}
  h1{font-size:18px;margin-bottom:24px;color:#38c6e8;text-align:center}
  label{display:block;font-size:12px;color:#8ba3ac;margin-bottom:6px}
  input[type="email"],input[type="password"]{width:100%;padding:10px 12px;background:#0a0e12;border:1px solid #1a2830;border-radius:4px;color:#e8f7fc;font-family:inherit;font-size:14px;margin-bottom:16px;outline:none;transition:border-color .15s}
  input:focus{border-color:#38c6e8}
  button{width:100%;padding:10px;background:#38c6e8;color:#0a0e12;border:none;border-radius:4px;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;transition:background .15s}
  button:hover{background:#5ed8ff}
</style>
</head>
<body>
<div class="login-box">
  <h1>Knowledge Base</h1>
  ${errorMsg}
  <form method="POST" action="/login">
    <label for="email">Email</label>
    <input id="email" name="email" type="email" required autocomplete="username"/>
    <label for="password">Пароль</label>
    <input id="password" name="password" type="password" required autocomplete="current-password"/>
    <button type="submit">Войти</button>
  </form>
</div>
</body>
</html>`, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    const url = new URL(request.url);
    const secret = env.COOKIE_SECRET;

    if (request.method === "POST" && url.pathname === "/login") {
      const contentType = request.headers.get("Content-Type") || "";
      let email = "";
      let password = "";

      if (contentType.includes("application/x-www-form-urlencoded")) {
        const body = await request.text();
        const params = new URLSearchParams(body);
        email = params.get("email") || "";
        password = params.get("password") || "";
      } else if (contentType.includes("application/json")) {
        const body = await request.json() as any;
        email = body.email || "";
        password = body.password || "";
      }

      if (!email || !password) {
        return loginPage("Заполните все поля");
      }

      const res = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          "apikey": env.SUPABASE_ANON_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      if (res.status === 200) {
        const data = await res.json() as any;
        if (data.access_token) {
          const timestamp = Math.floor(Date.now() / 1000).toString();
          const sig = await sign(timestamp, secret);
          return new Response(null, {
            status: 302,
            headers: {
              "Location": "/",
              "Set-Cookie": `${COOKIE_NAME}=${timestamp}.${sig}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE_SECONDS}`
            }
          });
        }
      }

      return loginPage("Неверный email или пароль");
    }

    const cookieValue = getCookie(request, COOKIE_NAME);

    if (cookieValue) {
      const [timestamp, sig] = cookieValue.split(".");
      const expectedSig = await sign(timestamp, secret);
      const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);

      if (sig === expectedSig && age < MAX_AGE_SECONDS) {
        return env.ASSETS.fetch(request);
      }
    }

    return loginPage();
  }
};
