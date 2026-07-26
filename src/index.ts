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

    const secret = env.COOKIE_SECRET;
    const cookieValue = getCookie(request, COOKIE_NAME);

    if (cookieValue) {
      const [timestamp, sig] = cookieValue.split(".");
      const expectedSig = await sign(timestamp, secret);
      const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);

      if (sig === expectedSig && age < MAX_AGE_SECONDS) {
        return env.ASSETS.fetch(request);
      }
    }

    const auth = request.headers.get("Authorization");
    const expectedUser = env.BASIC_AUTH_USER;
    const expectedPass = env.BASIC_AUTH_PASS;

    if (!auth || !auth.startsWith("Basic ")) {
      return new Response("Требуется авторизация", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Private Knowledge Base"' }
      });
    }

    const [user, pass] = atob(auth.split(" ")[1]).split(":");

    if (user !== expectedUser || pass !== expectedPass) {
      return new Response("Неверный логин или пароль", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Private Knowledge Base"' }
      });
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const sig = await sign(timestamp, secret);
    const response = await env.ASSETS.fetch(request);
    const newResponse = new Response(response.body, response);
    newResponse.headers.append(
      "Set-Cookie",
      `${COOKIE_NAME}=${timestamp}.${sig}; Path=/; HttpOnly; Secure; SameSite=Strict`
    );
    return newResponse;
  }
};
