/******************************************************
 * DEVONE DASHBOARD
 * Google OAuth + Cloudflare KV Session
 ******************************************************/

const APPS = {

  "/giao-dich":
    "https://script.google.com/macros/s/AKfycbzkpy8_3PojvNGf9_wZrIJMKcQ9_U9ww3l7pcvQpRgL6_FIHA_hS9D_I20YQ3gFPXxVdw/exec",

  "/coc-no":
    "https://script.google.com/macros/s/AKfycbwzKHlRArkUlaBBtiNSZDsAZi3OYlAaq1t3ECssJo5jOmF89VuDFd2OdI1WmtGlqQ5f/exec"

};


/******************************************************
 * EMAIL ĐƯỢC PHÉP
 *
 * Đổi thành email thực tế.
 ******************************************************/

const ALLOWED_EMAILS = [

  "winter.night.2211@gmail.com",
  "clonegame00014@gmail.com",
  "info@binhannhienhotel.com.vn",
  "sales.binhannhienhotel@gmail.com",
  "emaasdasdwil3@gmail.com"

];


/******************************************************
 * GOOGLE OAUTH
 ******************************************************/

const GOOGLE_AUTH_URL =
  "https://accounts.google.com/o/oauth2/v2/auth";

const GOOGLE_TOKEN_URL =
  "https://oauth2.googleapis.com/token";

const GOOGLE_USERINFO_URL =
  "https://openidconnect.googleapis.com/v1/userinfo";


/******************************************************
 * SESSION
 ******************************************************/

const SESSION_TTL =
  60 * 60 * 24 * 7;


/******************************************************
 * COOKIE
 ******************************************************/

const SESSION_COOKIE =
  "devone_session";


/******************************************************
 * MAIN
 ******************************************************/

export default {

  async fetch(request, env) {

    try {

      return await handleRequest(
        request,
        env
      );

    }
    catch (error) {

      console.error(error);

      return new Response(
        "Internal Server Error",
        {
          status: 500,
          headers: {
            "Content-Type":
              "text/plain; charset=UTF-8"
          }
        }
      );

    }

  }

};


/******************************************************
 * ROUTER
 ******************************************************/

async function handleRequest(
  request,
  env
) {

  const url =
    new URL(request.url);


  /****************************************************
   * TRANG CHỦ
   ****************************************************/

  if (
    url.pathname === "/" ||
    url.pathname === ""
  ) {

    const session =
      await getSession(
        request,
        env
      );


    if (!session) {

      return redirect(
        "/login"
      );

    }


    return new Response(
      homePage(
        session.email
      ),
      {
        headers: {
          "Content-Type":
            "text/html; charset=UTF-8",

          "Cache-Control":
            "no-store"
        }
      }
    );

  }


  /****************************************************
   * LOGIN
   ****************************************************/

  if (
    url.pathname === "/login"
  ) {

    return googleLogin(
      request,
      env
    );

  }


  /****************************************************
   * GOOGLE CALLBACK
   ****************************************************/

  if (
    url.pathname === "/oauth/callback"
  ) {

    return googleCallback(
      request,
      env
    );

  }


  /****************************************************
   * LOGOUT
   ****************************************************/

  if (
    url.pathname === "/logout"
  ) {

    return logout(
      request,
      env
    );

  }


  /****************************************************
   * DASHBOARD
   ****************************************************/

  const appKey =
    getAppKey(
      url.pathname
    );


  if (!appKey) {

    return new Response(
      "404 - Not Found",
      {
        status: 404
      }
    );

  }


  /****************************************************
   * KIỂM TRA SESSION
   ****************************************************/

  const session =
    await getSession(
      request,
      env
    );


  if (!session) {

    return redirect(
      "/login?continue=" +
      encodeURIComponent(
        url.pathname +
        url.search
      )
    );

  }


  /****************************************************
   * PROXY APP SCRIPT
   ****************************************************/

  return proxyGoogleScript(
    request,
    env,
    appKey
  );

}


/******************************************************
 * GOOGLE LOGIN
 ******************************************************/

async function googleLogin(
  request,
  env
) {

  const url =
    new URL(request.url);


  const continueUrl =
    url.searchParams.get(
      "continue"
    ) ||
    "/";


  const state =
    crypto.randomUUID();


  await env.SESSIONS.put(

    "oauth_state:" +
    state,

    JSON.stringify({
      continueUrl: continueUrl
    }),

    {
      expirationTtl: 600
    }

  );


  const redirectUri =
    getRedirectUri(
      url
    );


  const googleUrl =
    new URL(
      GOOGLE_AUTH_URL
    );


  googleUrl.searchParams.set(
    "client_id",
    env.GOOGLE_CLIENT_ID
  );


  googleUrl.searchParams.set(
    "redirect_uri",
    redirectUri
  );


  googleUrl.searchParams.set(
    "response_type",
    "code"
  );


  googleUrl.searchParams.set(
    "scope",
    "openid email profile"
  );


  googleUrl.searchParams.set(
    "state",
    state
  );


  googleUrl.searchParams.set(
    "prompt",
    "select_account"
  );


  return redirect(
    googleUrl.toString()
  );

}


/******************************************************
 * GOOGLE CALLBACK
 ******************************************************/

async function googleCallback(
  request,
  env
) {

  const url =
    new URL(request.url);


  const code =
    url.searchParams.get(
      "code"
    );


  const state =
    url.searchParams.get(
      "state"
    );


  if (!code || !state) {

    return errorPage(
      "Google OAuth không hợp lệ."
    );

  }


  /****************************************************
   * KIỂM TRA STATE
   ****************************************************/

  const stateKey =
    "oauth_state:" +
    state;


  const stateData =
    await env.SESSIONS.get(
      stateKey,
      "json"
    );


  if (!stateData) {

    return errorPage(
      "OAuth state không hợp lệ hoặc đã hết hạn."
    );

  }


  await env.SESSIONS.delete(
    stateKey
  );


  /****************************************************
   * ĐỔI CODE → TOKEN
   ****************************************************/

  const redirectUri =
    getRedirectUri(
      url
    );


  const tokenResponse =
    await fetch(
      GOOGLE_TOKEN_URL,
      {

        method: "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded"
        },

        body:
          new URLSearchParams({

            code:
              code,

            client_id:
              env.GOOGLE_CLIENT_ID,

            client_secret:
              env.GOOGLE_CLIENT_SECRET,

            redirect_uri:
              redirectUri,

            grant_type:
              "authorization_code"

          })

      }
    );


  if (!tokenResponse.ok) {

    console.error(
      await tokenResponse.text()
    );

    return errorPage(
      "Không thể xác thực với Google."
    );

  }


  const token =
    await tokenResponse.json();


  /****************************************************
   * LẤY THÔNG TIN USER
   ****************************************************/

  const userResponse =
    await fetch(
      GOOGLE_USERINFO_URL,
      {

        headers: {

          Authorization:
            "Bearer " +
            token.access_token

        }

      }
    );


  if (!userResponse.ok) {

    return errorPage(
      "Không thể lấy thông tin tài khoản Google."
    );

  }


  const user =
    await userResponse.json();


  const email =
    String(
      user.email ||
      ""
    )
      .trim()
      .toLowerCase();


  /****************************************************
   * KIỂM TRA EMAIL
   ****************************************************/

  if (
    !email ||
    !ALLOWED_EMAILS
      .map(
        e =>
          e.toLowerCase()
      )
      .includes(email)
  ) {

    return new Response(

      `
      <!DOCTYPE html>

      <html lang="vi">

      <head>
        <meta charset="UTF-8">
        <title>Không có quyền</title>
      </head>

      <body style="
        font-family:Arial;
        text-align:center;
        padding:60px;
      ">

        <h1>🚫 Không có quyền truy cập</h1>

        <p>
          Tài khoản:
          <b>${escapeHtml(email)}</b>
        </p>

        <p>
          Email này chưa được cấp quyền sử dụng Dashboard.
        </p>

        <p>
          <a href="/logout">
            Đăng xuất
          </a>
        </p>

      </body>

      </html>
      `,

      {
        status: 403,

        headers: {
          "Content-Type":
            "text/html; charset=UTF-8"
        }

      }

    );

  }


  /****************************************************
   * TẠO SESSION
   ****************************************************/

  const sessionId =
    crypto.randomUUID();


  await env.SESSIONS.put(

    "session:" +
    sessionId,

    JSON.stringify({

      email:
        email,

      name:
        user.name || "",

      picture:
        user.picture || "",

      createdAt:
        Date.now()

    }),

    {
      expirationTtl:
        SESSION_TTL
    }

  );


  /****************************************************
   * COOKIE
   ****************************************************/

  const cookie =
    SESSION_COOKIE +
    "=" +
    sessionId +
    "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=" +
    SESSION_TTL;


  return new Response(
    null,
    {

      status: 302,

      headers: {

        Location:
          stateData.continueUrl ||
          "/",

        "Set-Cookie":
          cookie,

        "Cache-Control":
          "no-store"

      }

    }
  );

}


/******************************************************
 * LẤY SESSION
 ******************************************************/

async function getSession(
  request,
  env
) {

  const cookie =
    request.headers.get(
      "Cookie"
    );


  if (!cookie) {
    return null;
  }


  const match =
    cookie.match(
      new RegExp(
        SESSION_COOKIE +
        "=([^;]+)"
      )
    );


  if (!match) {
    return null;
  }


  const sessionId =
    match[1];


  const session =
    await env.SESSIONS.get(

      "session:" +
      sessionId,

      "json"

    );


  return session || null;

}


/******************************************************
 * LOGOUT
 ******************************************************/

async function logout(
  request,
  env
) {

  const cookie =
    request.headers.get(
      "Cookie"
    );


  if (cookie) {

    const match =
      cookie.match(
        new RegExp(
          SESSION_COOKIE +
          "=([^;]+)"
        )
      );


    if (match) {

      await env.SESSIONS.delete(
        "session:" +
        match[1]
      );

    }

  }


  return new Response(
    null,
    {

      status: 302,

      headers: {

        Location:
          "/login",

        "Set-Cookie":
          SESSION_COOKIE +
          "=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"

      }

    }
  );

}


/******************************************************
 * PROXY GOOGLE APPS SCRIPT
 ******************************************************/

async function proxyGoogleScript(
  request,
  env,
  appKey
) {

  const incomingUrl =
    new URL(
      request.url
    );


  const targetUrl =
    new URL(
      APPS[appKey]
    );


  /*
   * Giữ query
   */

  targetUrl.search =
    incomingUrl.search;


  const headers =
    new Headers(
      request.headers
    );


  /*
   * Xóa header của domain Worker
   */

  headers.delete(
    "host"
  );

  headers.delete(
    "cf-connecting-ip"
  );

  headers.delete(
    "cf-ipcountry"
  );

  headers.delete(
    "cf-ray"
  );


  const googleRequest =
    new Request(

      targetUrl.toString(),

      {

        method:
          request.method,

        headers:
          headers,

        body:
          (
            request.method === "GET" ||
            request.method === "HEAD"
          )
            ? undefined
            : request.body,

        redirect:
          "manual"

      }

    );


  let response =
    await fetch(
      googleRequest
    );


  /*
   * Xử lý redirect nội bộ
   */

  for (
    let i = 0;
    i < 10;
    i++
  ) {

    const location =
      response.headers.get(
        "Location"
      );


    if (!location) {
      break;
    }


    const redirectUrl =
      new URL(
        location,
        targetUrl
      );


    /*
     * Nếu Google redirect về
     * script.google.com hoặc
     * googleusercontent
     *
     * Worker tự fetch.
     */

    if (
      redirectUrl.hostname ===
        "script.google.com" ||

      redirectUrl.hostname ===
        "script.googleusercontent.com" ||

      redirectUrl.hostname.endsWith(
        ".googleusercontent.com"
      )
    ) {

      targetUrl.href =
        redirectUrl.href;


      response =
        await fetch(

          new Request(
            targetUrl.toString(),
            {

              method:
                request.method,

              headers:
                headers,

              body:
                (
                  request.method === "GET" ||
                  request.method === "HEAD"
                )
                  ? undefined
                  : request.body,

              redirect:
                "manual"

            }
          )

        );


      continue;

    }


    /*
     * Google Login
     *
     * KHÔNG cho URL script.google.com
     * lộ ra browser.
     *
     * Tuy nhiên nếu Apps Script yêu cầu
     * Google login thì browser vẫn phải
     * có phiên Google tương ứng.
     */

    if (
      redirectUrl.hostname ===
        "accounts.google.com"
    ) {

      const headers =
        new Headers(
          response.headers
        );


      headers.set(
        "Location",
        redirectUrl.toString()
      );


      return new Response(
        null,
        {

          status:
            response.status,

          headers:
            headers

        }
      );

    }


    break;

  }


  const responseHeaders =
    new Headers(
      response.headers
    );


  /*
   * Không để redirect Google
   * thoát ra browser.
   */

  responseHeaders.delete(
    "Location"
  );


  /*
   * Google có thể trả các header
   * không phù hợp khi reverse proxy.
   */

  responseHeaders.delete(
    "Content-Security-Policy"
  );


  responseHeaders.delete(
    "Content-Security-Policy-Report-Only"
  );


  /*
   * Cookie Google không nên
   * được gửi sang domain Worker.
   */

  responseHeaders.delete(
    "Set-Cookie"
  );


  return new Response(

    response.body,

    {

      status:
        response.status,

      statusText:
        response.statusText,

      headers:
        responseHeaders

    }

  );

}


/******************************************************
 * APP KEY
 ******************************************************/

function getAppKey(
  pathname
) {

  for (
    const key of Object.keys(APPS)
  ) {

    if (
      pathname === key ||
      pathname.startsWith(
        key + "/"
      )
    ) {

      return key;

    }

  }

  return null;

}


/******************************************************
 * REDIRECT URI
 ******************************************************/

function getRedirectUri(
  url
) {

  return (
    url.origin +
    "/oauth/callback"
  );

}


/******************************************************
 * REDIRECT
 ******************************************************/

function redirect(
  location
) {

  return new Response(
    null,
    {

      status: 302,

      headers: {

        Location:
          location,

        "Cache-Control":
          "no-store"

      }

    }
  );

}


/******************************************************
 * ERROR
 ******************************************************/

function errorPage(
  message
) {

  return new Response(

    `
    <!DOCTYPE html>

    <html lang="vi">

    <head>
      <meta charset="UTF-8">
      <title>Lỗi</title>
    </head>

    <body style="
      font-family:Arial;
      padding:60px;
      text-align:center;
    ">

      <h1>❌ Có lỗi</h1>

      <p>
        ${escapeHtml(message)}
      </p>

      <p>
        <a href="/">
          Về trang chủ
        </a>
      </p>

    </body>

    </html>
    `,

    {

      status: 500,

      headers: {

        "Content-Type":
          "text/html; charset=UTF-8"

      }

    }

  );

}


/******************************************************
 * HOME
 ******************************************************/

function homePage(
  email
) {

  return `

<!DOCTYPE html>

<html lang="vi">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
>

<title>DevOne Dashboard</title>

<style>

* {
  box-sizing:border-box;
}

body {

  margin:0;

  min-height:100vh;

  display:flex;

  align-items:center;

  justify-content:center;

  background:
    linear-gradient(
      135deg,
      #0f172a,
      #1e3a8a
    );

  font-family:
    Arial,
    Helvetica,
    sans-serif;

}

.container {

  width:min(
    92%,
    520px
  );

  padding:35px;

  background:#fff;

  border-radius:18px;

  box-shadow:
    0 20px 60px
    rgba(0,0,0,.25);

}

h1 {

  margin-top:0;

  text-align:center;

  color:#17365d;

}

.user {

  text-align:center;

  color:#666;

  margin-bottom:25px;

}

.dashboard-btn {

  display:block;

  width:100%;

  padding:18px;

  margin-top:15px;

  border-radius:12px;

  text-decoration:none;

  color:white;

  font-size:17px;

  font-weight:bold;

  text-align:center;

}

.giao-dich {
  background:#17365d;
}

.coc-no {
  background:#548235;
}

.logout {

  display:block;

  text-align:center;

  margin-top:25px;

  color:#c00000;

  text-decoration:none;

}

</style>

</head>

<body>

<div class="container">

<h1>
  DevOne Dashboard
</h1>

<div class="user">

  👤 ${escapeHtml(email)}

</div>

<a
  class="dashboard-btn giao-dich"
  href="/giao-dich"
>
  📊 Dashboard Giao dịch
</a>

<a
  class="dashboard-btn coc-no"
  href="/coc-no"
>
  💰 Dashboard Cọc & Nợ
</a>

<a
  class="logout"
  href="/logout"
>
  Đăng xuất
</a>

</div>

</body>

</html>

`;

}


/******************************************************
 * ESCAPE HTML
 ******************************************************/

function escapeHtml(
  value
) {

  return String(
    value || ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}
