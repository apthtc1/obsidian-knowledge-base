const AUTH_FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>`;

const AUTH_CSS = `
  *{margin:0;padding:0;box-sizing:border-box}
  body{
    background:#0F1115;
    color:#E5E7EB;
    font-family:'Montserrat',system-ui,-apple-system,sans-serif;
    display:flex;align-items:center;justify-content:center;min-height:100vh;
  }
  .auth-grid{
    position:fixed;inset:0;z-index:0;pointer-events:none;
    background-image:
      linear-gradient(rgba(176,184,196,0.055) 1px,transparent 1px),
      linear-gradient(90deg,rgba(176,184,196,0.055) 1px,transparent 1px);
    background-size:56px 56px;
    -webkit-mask-image:radial-gradient(440px circle at var(--mx,50%) var(--my,50%),#000 8%,transparent 72%);
    mask-image:radial-gradient(440px circle at var(--mx,50%) var(--my,50%),#000 8%,transparent 72%);
  }
  .login-box{
    position:relative;z-index:1;
    background:#161A20;border:1px solid #2A2E35;border-radius:12px;padding:36px;
    width:100%;max-width:400px;box-shadow:0 24px 70px rgba(0,0,0,0.45);
  }
  h1{font-size:20px;font-weight:600;margin-bottom:24px;color:#E5E7EB;text-align:center;letter-spacing:0.3px}
  label{display:block;font-size:12px;color:#9CA3AF;margin-bottom:6px;font-weight:500}
  input[type="email"],input[type="password"],input[type="text"]{
    width:100%;padding:11px 12px;background:#0F1115;border:1px solid #2A2E35;border-radius:8px;
    color:#E5E7EB;font-family:inherit;font-size:14px;margin-bottom:16px;outline:none;transition:border-color .2s
  }
  input::placeholder{color:#5B6470}
  input:focus{border-color:#B0B8C4}
  input.code{letter-spacing:6px;font-size:20px;text-align:center;font-weight:600}
  button{
    width:100%;padding:11px;background:#B0B8C4;color:#0F1115;border:none;border-radius:8px;
    font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;transition:background .2s,color .2s
  }
  button:hover{background:#E5E7EB}
  button:disabled{opacity:.6;cursor:default}
  .link{display:block;text-align:center;margin-top:16px;font-size:13px;color:#9CA3AF;text-decoration:none;transition:color .2s}
  .link:hover{color:#E5E7EB}
  .error{color:#ff7a7a;margin-bottom:12px;font-size:13px;line-height:1.5}
  .success{color:#B0B8C4;margin-bottom:16px}
  .debug{font-size:11px;color:#9CA3AF;word-break:break-all;line-height:1.4}
`;

const AUTH_SPOTLIGHT_SCRIPT = `
  (function(){
    var grid=document.createElement('div');
    grid.className='auth-grid';
    document.body.insertBefore(grid,document.body.firstChild);
    var gx=innerWidth/2,gy=innerHeight/2,tx=gx,ty=gy;
    addEventListener('mousemove',function(e){tx=e.clientX;ty=e.clientY},{passive:true});
    (function t(){gx+=(tx-gx)*0.08;gy+=(ty-gy)*0.08;grid.style.setProperty('--mx',gx+'px');grid.style.setProperty('--my',gy+'px');requestAnimationFrame(t)})();
  })();
`;

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

    async function getSessionEmail(request: Request, secret: string): Promise<string | null> {
      const cookieValue = getCookie(request, COOKIE_NAME);
      if (!cookieValue) return null;
      const parts = cookieValue.split(".");
      if (parts.length !== 3) return null;
      const [timestamp, emailB64, sig] = parts;
      const expectedSig = await sign(`${timestamp}.${emailB64}`, secret);
      const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
      if (sig !== expectedSig || age >= MAX_AGE_SECONDS) return null;
      try {
        return decodeURIComponent(atob(emailB64));
      } catch (e) {
        return null;
      }
    }

    function loginPage(error?: string): Response {
      const errorMsg = error ? `<p class="error">${error}</p>` : "";
      return new Response(`<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Вход — InfoSec Vault</title>
${AUTH_FONTS}
<style>
${AUTH_CSS}
</style>
</head>
<body>
<div class="login-box">
  <h1>InfoSec Vault</h1>
  ${errorMsg}
  <form method="POST" action="/login">
    <label for="email">Email</label>
    <input id="email" name="email" type="email" required autocomplete="username"/>
    <label for="password">Пароль</label>
    <input id="password" name="password" type="password" required autocomplete="current-password"/>
    <button type="submit">Войти</button>
  </form>
  <a href="/forgot-password" class="link">Забыли пароль</a>
</div>
<script>
${AUTH_SPOTLIGHT_SCRIPT}
</script>
</body>
</html>`, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
      });
    }

    function forgotPage(message?: string, isError = false): Response {
      const msgHtml = message ? `<p class="${isError ? 'error' : 'success'}">${message}</p>` : "";
      return new Response(`<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Восстановление пароля — InfoSec Vault</title>
${AUTH_FONTS}
<style>
${AUTH_CSS}
</style>
</head>
<body>
<div class="login-box">
  <h1>Восстановление пароля</h1>
  ${msgHtml}
  <form method="POST" action="/forgot-password">
    <label for="email">Email</label>
    <input id="email" name="email" type="email" required autocomplete="email"/>
    <button type="submit">Отправить ссылку для сброса</button>
  </form>
  <a href="/login" class="link">← Назад к входу</a>
</div>
<script>
${AUTH_SPOTLIGHT_SCRIPT}
</script>
</body>
</html>`, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
      });
    }

    function resetPage(error?: string, prefillEmail?: string, debug?: string): Response {
      const errorMsg = error ? `<p class="error">${error}</p>` : "";
      const emailValue = prefillEmail ? ` value="${prefillEmail}" readonly` : "";
      const debugHtml = debug ? `<div class="debug" style="margin-bottom:12px;">${debug}</div>` : "";
      return new Response(`<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Сброс пароля — InfoSec Vault</title>
${AUTH_FONTS}
<style>
${AUTH_CSS}
</style>
</head>
<body>
<div class="login-box">
  <h1>Сброс пароля</h1>
  <div id="error-box">${errorMsg}${debugHtml}</div>
  <form id="reset-form" novalidate>
    <label for="email">Email</label>
    <input id="email" name="email" type="email" required autocomplete="email"${emailValue}/>
    <label for="code">Код из письма</label>
    <input id="code" name="code" type="text" class="code" required inputmode="numeric" autocomplete="one-time-code"/>
    <label for="password">Новый пароль</label>
    <input id="password" name="password" type="password" required autocomplete="new-password" minlength="8"/>
    <label for="confirm">Подтвердите пароль</label>
    <input id="confirm" name="confirm" type="password" required autocomplete="new-password" minlength="8"/>
    <button type="submit">Сохранить</button>
  </form>
  <a href="/forgot-password" class="link">← Запросить новый код</a>
</div>
<script>
${AUTH_SPOTLIGHT_SCRIPT}
  (function() {
    var errorBox = document.getElementById('error-box');
    document.getElementById('reset-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      errorBox.innerHTML = '';
      var email = document.getElementById('email').value.trim();
      var code = document.getElementById('code').value.trim();
      var pass = document.getElementById('password').value;
      var confirm = document.getElementById('confirm').value;
      if (!email) { errorBox.innerHTML = '<p class="error">Введите email</p>'; return; }
      if (!code) { errorBox.innerHTML = '<p class="error">Введите код из письма</p>'; return; }
      if (pass !== confirm) { errorBox.innerHTML = '<p class="error">Пароли не совпадают</p>'; return; }
      var btn = e.target.querySelector('button');
      btn.disabled = true;
      btn.textContent = 'Сохранение...';
      try {
        var res = await fetch('/update-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, code: code, password: pass })
        });
        var text = await res.text();
        if (res.ok) {
          document.body.innerHTML = '<div class="login-box"><h1>Готово</h1><p class="success">Пароль успешно изменён!</p><a href="/login" class="link">Войти</a></div>';
        } else {
          var errMsg = 'Неверный или устаревший код. Запросите новый через «Забыли пароль?».';
          var debugHtml = '';
          try { var d = JSON.parse(text); if (d.error) errMsg = d.error; if (d.debug) debugHtml = '<div class="debug" style="margin-top:8px;border-top:1px solid #2A2E35;padding-top:8px;">' + d.debug.join('<br>') + '</div>'; } catch(e) {}
          btn.disabled = false;
          btn.textContent = 'Сохранить';
          errorBox.innerHTML = '<p class="error">' + errMsg + '</p>' + debugHtml;
        }
      } catch (err) {
        btn.disabled = false;
        btn.textContent = 'Сохранить';
        errorBox.innerHTML = '<p class="error">Ошибка сети. Проверьте подключение и попробуйте снова.</p>';
      }
    });
  })();
</script>
</body>
</html>`, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
      });
    }

    function profilePage(email: string): Response {
      return new Response(`<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Профиль — InfoSec Vault</title>
${AUTH_FONTS}
<style>
${AUTH_CSS}
  p{font-size:14px;margin-bottom:8px}
  .email{font-size:14px;color:#9CA3AF;margin-bottom:24px;word-break:break-all}
  a.btn{display:block;text-align:center;padding:11px;background:#B0B8C4;color:#0F1115;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-bottom:12px;transition:background .2s}
  a.btn:hover{background:#E5E7EB}
  a.btn-outline{display:block;text-align:center;padding:11px;background:transparent;color:#9CA3AF;border:1px solid #2A2E35;border-radius:8px;text-decoration:none;font-size:14px;transition:border-color .2s,color .2s}
  a.btn-outline:hover{border-color:#B0B8C4;color:#E5E7EB}
</style>
</head>
<body>
<div class="login-box">
  <h1>Профиль</h1>
  <p>Вы вошли как:</p>
  <div class="email">${email}</div>
  <a href="/logout" class="btn">Выйти</a>
  <a href="/" class="btn-outline">← На главную</a>
</div>
<script>
${AUTH_SPOTLIGHT_SCRIPT}
</script>
</body>
</html>`, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
      });
    }

    const url = new URL(request.url);
    const secret = env.COOKIE_SECRET;
    const publicPaths = ["/login", "/forgot-password", "/reset-password", "/update-password", "/logout"];

    // Public paths — no auth required
    if (publicPaths.includes(url.pathname)) {

    if (request.method === "GET" && url.pathname === "/logout") {
      return new Response(null, {
        status: 302,
        headers: {
          "Location": "/login",
          "Set-Cookie": `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
        }
      });
    }

    if (request.method === "GET" && url.pathname === "/login") {
      return loginPage();
    }

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
          const emailB64 = btoa(encodeURIComponent(email));
          const sig = await sign(`${timestamp}.${emailB64}`, secret);
          return new Response(null, {
            status: 302,
            headers: {
              "Location": "/",
              "Set-Cookie": `${COOKIE_NAME}=${timestamp}.${emailB64}.${sig}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE_SECONDS}`
            }
          });
        }
      }

      return loginPage("Неверный email или пароль");
    }

    if (request.method === "GET" && url.pathname === "/forgot-password") {
      return forgotPage();
    }

    if (request.method === "POST" && url.pathname === "/forgot-password") {
      const contentType = request.headers.get("Content-Type") || "";
      let email = "";

      if (contentType.includes("application/x-www-form-urlencoded")) {
        const body = await request.text();
        const params = new URLSearchParams(body);
        email = params.get("email") || "";
      } else if (contentType.includes("application/json")) {
        const body = await request.json() as any;
        email = body.email || "";
      }

      if (!email) {
        return forgotPage("Введите email", true);
      }

      const redirectTo = "https://obsidian-knowledge-base.apthtc78.workers.dev/reset-password";
      const recoverRes = await fetch(`${env.SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
        method: "POST",
        headers: {
          "apikey": env.SUPABASE_ANON_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          gotrue_meta_security: {},
          redirect_to: redirectTo
        })
      });

      const recoverText = await recoverRes.text();
      const debugParam = encodeURIComponent(`recover:${recoverRes.status} ${recoverText}`);

      return new Response(null, {
        status: 302,
        headers: { "Location": `/reset-password?email=${encodeURIComponent(email)}&debug=${debugParam}` }
      });
    }

    if (url.pathname === "/reset-password") {
      const debugParam = url.searchParams.get("debug") || "";
      return resetPage("", url.searchParams.get("email") || "", debugParam);
    }

    if (request.method === "POST" && url.pathname === "/update-password") {
      try {
        const body = await request.json() as any;
        const email = (body.email || "").trim();
        const code = (body.code || "").trim();
        const newPassword = body.password;

        if (!email) {
          return new Response(JSON.stringify({ error: "Введите email" }), {
            status: 400, headers: { "Content-Type": "application/json" }
          });
        }
        if (!code) {
          return new Response(JSON.stringify({ error: "Введите код из письма" }), {
            status: 400, headers: { "Content-Type": "application/json" }
          });
        }
        if (!newPassword || newPassword.length < 8) {
          return new Response(JSON.stringify({ error: "Пароль должен быть не менее 8 символов" }), {
            status: 400, headers: { "Content-Type": "application/json" }
          });
        }

        // Attempt 1: verify with token (raw OTP code) + email, type recovery
        let errors: string[] = [];
        let verifyRes = await fetch(`${env.SUPABASE_URL}/auth/v1/verify`, {
          method: "POST",
          headers: {
            "apikey": env.SUPABASE_ANON_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email, token: code, type: "recovery" })
        });
        let verifyText = await verifyRes.text();
        errors.push(`type=recovery: ${verifyRes.status} ${verifyText}`);

        let verifyData: any = {};
        try { verifyData = JSON.parse(verifyText); } catch (e) {}

        // Attempt 2: try type magiclink instead of recovery
        if (!verifyRes.ok && verifyData.error_code === "otp_expired") {
          verifyRes = await fetch(`${env.SUPABASE_URL}/auth/v1/verify`, {
            method: "POST",
            headers: {
              "apikey": env.SUPABASE_ANON_KEY,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, token: code, type: "magiclink" })
          });
          verifyText = await verifyRes.text();
          errors.push(`type=magiclink: ${verifyRes.status} ${verifyText}`);
          try { verifyData = JSON.parse(verifyText); } catch (e) {}
        }

        // Attempt 3: try type email
        if (!verifyRes.ok && verifyData.error_code === "otp_expired") {
          verifyRes = await fetch(`${env.SUPABASE_URL}/auth/v1/verify`, {
            method: "POST",
            headers: {
              "apikey": env.SUPABASE_ANON_KEY,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, token: code, type: "email" })
          });
          verifyText = await verifyRes.text();
          errors.push(`type=email: ${verifyRes.status} ${verifyText}`);
          try { verifyData = JSON.parse(verifyText); } catch (e) {}
        }

        // Attempt 4: try token_hash + type recovery (no email)
        if (!verifyRes.ok && verifyData.error_code === "otp_expired") {
          verifyRes = await fetch(`${env.SUPABASE_URL}/auth/v1/verify`, {
            method: "POST",
            headers: {
              "apikey": env.SUPABASE_ANON_KEY,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ token_hash: code, type: "recovery" })
          });
          verifyText = await verifyRes.text();
          errors.push(`token_hash: ${verifyRes.status} ${verifyText}`);
          try { verifyData = JSON.parse(verifyText); } catch (e) {}
        }

        // Attempt 5: compute SHA-256(email+code) on worker and send as token_hash
        if (!verifyRes.ok && verifyData.error_code === "otp_expired") {
          const enc = new TextEncoder();
          const hashBuf = await crypto.subtle.digest("SHA-256", enc.encode(email.toLowerCase() + code));
          const hashArr = Array.from(new Uint8Array(hashBuf));
          const computedHash = hashArr.map(b => b.toString(16).padStart(2, "0")).join("");
          console.log("Verify attempt 5: computed_hash=" + computedHash);
          verifyRes = await fetch(`${env.SUPABASE_URL}/auth/v1/verify`, {
            method: "POST",
            headers: {
              "apikey": env.SUPABASE_ANON_KEY,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ token_hash: computedHash, type: "recovery" })
          });
          verifyText = await verifyRes.text();
          errors.push(`sha256: ${verifyRes.status} ${verifyText}`);
          try { verifyData = JSON.parse(verifyText); } catch (e) {}
        }

        if (!verifyRes.ok || !verifyData.access_token) {
          return new Response(JSON.stringify({
            error: "Неверный или устаревший код. Запросите новый через «Забыли пароль?».",
            debug: errors
          }), {
            status: 400, headers: { "Content-Type": "application/json" }
          });
        }

        const updateRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
          method: "PUT",
          headers: {
            "apikey": env.SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${verifyData.access_token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ password: newPassword })
        });

        if (updateRes.ok) {
          return new Response("OK", { status: 200 });
        }

        const errText = await updateRes.text();
        let errData: any = {};
        try { errData = JSON.parse(errText); } catch(e) {}
        return new Response(JSON.stringify({ error: errData.msg || errData.message || "Не удалось обновить пароль" }), {
          status: updateRes.status,
          headers: { "Content-Type": "application/json" }
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: "Ошибка сервера: " + (e.message || String(e)) }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // End of public paths — protected paths require auth
    } else {

    const userEmail = await getSessionEmail(request, secret);

    if (userEmail) {
      if (url.pathname === "/profile") {
        return profilePage(userEmail);
      }
      return env.ASSETS.fetch(request);
    }

    return loginPage();
    }
  }
};