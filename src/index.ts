export default {
  async fetch(request: Request, env: any): Promise<Response> {
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

    return env.ASSETS.fetch(request);
  }
};
