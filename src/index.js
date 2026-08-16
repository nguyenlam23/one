const APPS = {
  "/giao-dich":
    "https://script.google.com/macros/s/AKfycbzkpy8_3PojvNGf9_wZrIJMKcQ9_U9ww3l7pcvQpRgL6_FIHA_hS9D_I20YQ3gFPXxVdw/exec",

  "/coc-no":
    "https://script.google.com/macros/s/AKfycbwzKHlRArkUlaBBtiNSZDsAZi3OYlAaq1t3ECssJo5jOmF89VuDFd2OdI1WmtGlqQ5f/exec"
};


// ====================================================
// TRANG CHỦ
// ====================================================

function homePage() {

  return `
<!DOCTYPE html>

<html lang="vi">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1"
>

<title>DevOne Dashboard</title>

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;

  display: flex;
  align-items: center;
  justify-content: center;

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

  width: min(92%, 520px);

  padding: 35px;

  background: white;

  border-radius: 18px;

  box-shadow:
    0 20px 60px
    rgba(0,0,0,.25);

}

h1 {

  margin-top: 0;

  text-align: center;

  color: #17365d;

}

.subtitle {

  text-align: center;

  color: #666;

  margin-bottom: 30px;

}

.dashboard-btn {

  display: block;

  width: 100%;

  padding: 18px;

  margin-top: 15px;

  border-radius: 12px;

  text-decoration: none;

  color: white;

  font-size: 17px;

  font-weight: bold;

  text-align: center;

  transition: .2s;

}

.dashboard-btn:hover {

  transform: translateY(-2px);

  box-shadow:
    0 8px 20px
    rgba(0,0,0,.18);

}

.giao-dich {
  background: #17365d;
}

.coc-no {
  background: #548235;
}

</style>

</head>

<body>

<div class="container">

<h1>
  DevOne Dashboard
</h1>

<div class="subtitle">
  Chọn hệ thống cần truy cập
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

</div>

</body>

</html>
`;

}


// ====================================================
// TÌM APP
// ====================================================

function getAppKey(pathname) {

  for (const key of Object.keys(APPS)) {

    if (
      pathname === key ||
      pathname.startsWith(key + "/")
    ) {

      return key;

    }

  }

  return null;

}


// ====================================================
// KIỂM TRA URL GOOGLE NỘI BỘ
// ====================================================

function isGoogleInternalUrl(url) {

  const hostname =
    url.hostname.toLowerCase();


  return (

    hostname ===
      "script.google.com"

    ||

    hostname ===
      "script.googleusercontent.com"

    ||

    hostname.endsWith(
      ".googleusercontent.com"
    )

  );

}


// ====================================================
// GOOGLE LOGIN
//
// Những URL này phải để browser đi tới Google.
// ====================================================

function isGoogleLoginUrl(url) {

  const hostname =
    url.hostname.toLowerCase();


  return (

    hostname ===
      "accounts.google.com"

    ||

    hostname ===
      "accounts.googleusercontent.com"

  );

}


// ====================================================
// WORKER
// ====================================================

export default {

  async fetch(request, env, ctx) {

    const url =
      new URL(request.url);


    // ==================================================
    // TRANG CHỦ
    // ==================================================

    if (
      url.pathname === "/" ||
      url.pathname === ""
    ) {

      return new Response(
        homePage(),
        {
          status: 200,

          headers: {
            "Content-Type":
              "text/html; charset=UTF-8",

            "Cache-Control":
              "no-store"
          }
        }
      );

    }


    // ==================================================
    // XÁC ĐỊNH DASHBOARD
    // ==================================================

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
            "Content-Type":
              "text/plain; charset=UTF-8"
          }
        }
      );

    }


    // ==================================================
    // URL APP SCRIPT GỐC
    // ==================================================

    const appUrl =
      new URL(
        APPS[appKey]
      );


    /*
     * Query của người dùng
     * được chuyển sang Apps Script.
     */

    appUrl.search =
      url.search;


    // ==================================================
    // HEADER
    // ==================================================

    const headers =
      new Headers(
        request.headers
      );


    headers.delete("host");

    headers.delete(
      "cf-connecting-ip"
    );

    headers.delete(
      "cf-ipcountry"
    );

    headers.delete(
      "cf-ray"
    );


    // ==================================================
    // REQUEST BAN ĐẦU
    // ==================================================

    let targetUrl =
      appUrl;


    let response;


    // ==================================================
    // THEO REDIRECT NỘI BỘ CỦA GOOGLE
    //
    // Tối đa 10 lần để tránh loop.
    // ==================================================

    for (
      let attempt = 0;
      attempt < 10;
      attempt++
    ) {

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


      response =
        await fetch(
          googleRequest
        );


      const location =
        response.headers.get(
          "Location"
        );


      // Không có redirect
      if (!location) {
        break;
      }


      const redirectUrl =
        new URL(
          location,
          targetUrl
        );


      // ==================================================
      // GOOGLE LOGIN
      //
      // Cho browser đi tới Google.
      // ==================================================

      if (
        isGoogleLoginUrl(
          redirectUrl
        )
      ) {

        const redirectHeaders =
          new Headers(
            response.headers
          );


        redirectHeaders.set(
          "Location",
          redirectUrl.toString()
        );


        return new Response(
          null,
          {
            status:
              response.status,

            headers:
              redirectHeaders
          }
        );

      }


      // ==================================================
      // REDIRECT NỘI BỘ GOOGLE
      //
      // Worker tự fetch.
      //
      // Browser KHÔNG thấy URL này.
      // ==================================================

      if (
        isGoogleInternalUrl(
          redirectUrl
        )
      ) {

        targetUrl =
          redirectUrl;

        continue;

      }


      // ==================================================
      // REDIRECT VỀ DOMAIN CỦA MÌNH
      // ==================================================

      if (
        redirectUrl.hostname ===
        url.hostname
      ) {

        const redirectHeaders =
          new Headers(
            response.headers
          );


        redirectHeaders.set(
          "Location",
          redirectUrl.toString()
        );


        return new Response(
          null,
          {
            status:
              response.status,

            headers:
              redirectHeaders
          }
        );

      }


      // ==================================================
      // REDIRECT KHÁC
      // ==================================================

      const redirectHeaders =
        new Headers(
          response.headers
        );


      redirectHeaders.set(
        "Location",
        redirectUrl.toString()
      );


      return new Response(
        null,
        {
          status:
            response.status,

          headers:
            redirectHeaders
        }
      );

    }


    // ==================================================
    // RESPONSE CUỐI CÙNG
    // ==================================================

    const responseHeaders =
      new Headers(
        response.headers
      );


    /*
     * Không để Google gửi Location
     * ra browser nữa.
     */

    responseHeaders.delete(
      "Location"
    );


    /*
     * Một số header Google không nên
     * expose trực tiếp.
     */

    responseHeaders.delete(
      "Content-Security-Policy"
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

};
