/******************************************************
 * DEVONE DASHBOARD
 * Google OAuth + Cloudflare KV Session
 *
 * VERSION:
 * - Google OAuth trên Worker
 * - Session bằng Cloudflare KV
 * - Proxy Google Apps Script
 * - Không để script.google.com lộ ra browser
 ******************************************************/


/******************************************************
 * APPS SCRIPT
 ******************************************************/

const APPS = {

  "/giao-dich":
    "https://script.google.com/macros/s/AKfycbzkpy8_3PojvNGf9_wZrIJMKcQ9_U9ww3l7pcvQpRgL6_FIHA_hS9D_I20YQ3gFPXxVdw/exec",

  "/coc-no":
    "https://script.google.com/macros/s/AKfycbwzKHlRArkUlaBBtiNSZDsAZi3OYlAaq1t3ECssJo5jOmF89VuDFd2OdI1WmtGlqQ5f/exec"

};


/******************************************************
 * EMAIL ĐƯỢC PHÉP
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

      console.error(
        "WORKER ERROR:",
        error
      );

      return new Response(
        "Internal Server Error",
        {
          status: 500,
          headers: {
            "Content-Type":
              "text/plain; charset=UTF-8",

            "Cache-Control":
              "no-store"
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
   * DASHBOARD APP
   ****************************************************/

  const appKey =
    getAppKey(
      url.pathname
    );


  if (!appKey) {

    return new Response(
      "404 - Not Found",
      {
        status: 404,
        headers: {
          "Cache-Control":
            "no-store"
        }
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
      continueUrl:
        continueUrl
    }),

    {
      expirationTtl:
        600
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

        method:
          "POST",

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
      "GOOGLE TOKEN ERROR:",
      await tokenResponse.text()
    );

    return errorPage(
      "Không thể xác thực với Google."
    );

  }


  const token =
    await tokenResponse.json();


  /****************************************************
   * LẤY USER INFO
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
          e.trim().toLowerCase()
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
            "text/html; charset=UTF-8",

          "Cache-Control":
            "no-store"

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
          "=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",

        "Cache-Control":
          "no-store"

      }

    }
  );

}


/******************************************************
 * PROXY GOOGLE APPS SCRIPT
 *
 * QUAN TRỌNG:
 *
 * Browser:
 *
 *   dash.devone.top/coc-no
 *
 * Worker:
 *
 *   fetch Apps Script
 *
 * Nếu Apps Script trả:
 *
 *   302 Location: https://script.googleusercontent.com/...
 *
 * Worker tự fetch tiếp.
 *
 * Browser KHÔNG nhận Location đó.
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


  const baseTarget =
    new URL(
      APPS[appKey]
    );


  /****************************************************
   * GIỮ QUERY
   ****************************************************/

  baseTarget.search =
    incomingUrl.search;


  /****************************************************
   * HEADER CHO REQUEST TỚI GOOGLE
   *
   * Không gửi cookie session của Worker.
   ****************************************************/

  const headers =
    new Headers();


  for (
    const [
      key,
      value
    ]
    of request.headers
  ) {

    const lower =
      key.toLowerCase();


    if (
      lower === "host" ||
      lower === "cookie" ||
      lower === "authorization" ||
      lower === "cf-connecting-ip" ||
      lower === "cf-ipcountry" ||
      lower === "cf-ray" ||
      lower === "cf-visitor"
    ) {

      continue;

    }


    headers.set(
      key,
      value
    );

  }


  /****************************************************
   * USER AGENT
   ****************************************************/

  if (
    !headers.has(
      "User-Agent"
    )
  ) {

    headers.set(
      "User-Agent",
      "Mozilla/5.0"
    );

  }


  /****************************************************
   * REQUEST BODY
   ****************************************************/

  const body =
    (
      request.method === "GET" ||
      request.method === "HEAD"
    )
      ? undefined
      : request.body;


  /****************************************************
   * FETCH APPS SCRIPT
   *
   * redirect = manual
   ****************************************************/

  let currentUrl =
    baseTarget;


  let response =
    await fetch(

      new Request(
        currentUrl.toString(),
        {

          method:
            request.method,

          headers:
            headers,

          body:
            body,

          redirect:
            "manual"

        }
      )

    );


  /****************************************************
   * FOLLOW REDIRECT
   *
   * Tối đa 15 lần.
   ****************************************************/

  for (
    let i = 0;
    i < 15;
    i++
  ) {

    const location =
      response.headers.get(
        "Location"
      );


    /**************************************************
     * Không redirect nữa
     **************************************************/

    if (!location) {
      break;
    }


    const redirectUrl =
      new URL(
        location,
        currentUrl
      );


    console.log(
      "Apps Script redirect:",
      response.status,
      redirectUrl.hostname,
      redirectUrl.pathname
    );


    /**************************************************
     * CHỈ FOLLOW REDIRECT NỘI BỘ
     *
     * Không redirect browser.
     **************************************************/

    const hostname =
      redirectUrl.hostname.toLowerCase();


    const isGoogleInternal =
      hostname ===
        "script.google.com" ||

      hostname ===
        "script.googleusercontent.com" ||

      hostname.endsWith(
        ".googleusercontent.com"
      );


    if (!isGoogleInternal) {

      /************************************************
       * Nếu Google trả redirect ra domain khác
       * thì KHÔNG đẩy browser đi.
       *
       * Trả lỗi để không làm lộ Apps Script URL.
       ************************************************/

      console.error(
        "BLOCKED EXTERNAL REDIRECT:",
        redirectUrl.toString()
      );


      return new Response(

        "Ứng dụng đích yêu cầu redirect ra ngoài domain proxy.",

        {

          status: 502,

          headers: {

            "Content-Type":
              "text/plain; charset=UTF-8",

            "Cache-Control":
              "no-store"

          }

        }

      );

    }


    /**************************************************
     * FOLLOW REDIRECT BẰNG WORKER
     **************************************************/

    currentUrl =
      redirectUrl;


    response =
      await fetch(

        new Request(
          currentUrl.toString(),
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

  }


  /****************************************************
   * KIỂM TRA NẾU VẪN CÒN LOCATION
   ****************************************************/

  if (
    response.headers.has(
      "Location"
    )
  ) {

    console.error(
      "TOO MANY REDIRECTS:",
      response.headers.get(
        "Location"
      )
    );

  }


  /****************************************************
   * RESPONSE HEADERS
   ****************************************************/

  const responseHeaders =
    new Headers(
      response.headers
    );


  /****************************************************
   * TUYỆT ĐỐI KHÔNG ĐỂ LOCATION
   * CỦA APPS SCRIPT RA BROWSER
   ****************************************************/

  responseHeaders.delete(
    "Location"
  );


  /****************************************************
   * KHÔNG GỬI COOKIE CỦA GOOGLE
   ****************************************************/

  responseHeaders.delete(
    "Set-Cookie"
  );


  /****************************************************
   * CSP CỦA GOOGLE CÓ THỂ PHÁ PROXY
   ****************************************************/

  responseHeaders.delete(
    "Content-Security-Policy"
  );

  responseHeaders.delete(
    "Content-Security-Policy-Report-Only"
  );


  /****************************************************
   * GOOGLE FRAME OPTIONS
   ****************************************************/

  responseHeaders.delete(
    "X-Frame-Options"
  );


  /****************************************************
   * CONTENT-LOCATION
   *
   * Không để browser biết URL googleusercontent.
   ****************************************************/

  responseHeaders.delete(
    "Content-Location"
  );


  /****************************************************
   * RESPONSE
   ****************************************************/

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
 * ERROR PAGE
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

      status:
        500,

      headers: {

        "Content-Type":
          "text/html; charset=UTF-8",

        "Cache-Control":
          "no-store"

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
