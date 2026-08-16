const APPS = {
  "/giao-dich":
    "https://script.google.com/macros/s/AKfycbzkpy8_3PojvNGf9_wZrIJMKcQ9_U9ww3l7pcvQpRgL6_FIHA_hS9D_I20YQ3gFPXxVdw/exec",

  "/coc-no":
    "https://script.google.com/macros/s/AKfycbwzKHlRArkUlaBBtiNSZDsAZi3OYlAaq1t3ECssJo5jOmF89VuDFd2OdI1WmtGlqQ5f/exec"
};


// ====================================================
// TÌM ROUTE TƯƠNG ỨNG
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
// HTML TRANG CHỦ
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

  width: min(
    92%,
    520px
  );

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

  transform:
    translateY(-2px);

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
// MAIN WORKER
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
    // GOOGLE APP SCRIPT URL
    // ==================================================

    const googleUrl =
      new URL(
        APPS[appKey]
      );


    googleUrl.search =
      url.search;


    // ==================================================
    // COPY REQUEST HEADERS
    // ==================================================

    const headers =
      new Headers(
        request.headers
      );


    // Host phải là Google
    headers.delete("host");


    // Một số header không nên chuyển tiếp
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
    // TẠO REQUEST GOOGLE
    // ==================================================

    const googleRequest =
      new Request(
        googleUrl.toString(),
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


    // ==================================================
    // GỌI GOOGLE
    // ==================================================

    let response =
      await fetch(
        googleRequest
      );


    // ==================================================
    // XỬ LÝ REDIRECT
    // ==================================================

    const responseHeaders =
      new Headers(
        response.headers
      );


    const location =
      responseHeaders.get(
        "Location"
      );


    if (location) {

      const newLocation =
        rewriteRedirect(
          location,
          googleUrl,
          url,
          appKey
        );


      if (newLocation) {

        responseHeaders.set(
          "Location",
          newLocation
        );

      }

    }


    // ==================================================
    // TRẢ RESPONSE
    // ==================================================

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


// ====================================================
// REWRITE REDIRECT
// ====================================================

function rewriteRedirect(
  location,
  googleUrl,
  currentUrl,
  appKey
) {

  try {

    const redirectUrl =
      new URL(
        location,
        googleUrl
      );


    // ==================================================
    // 1. GOOGLE LOGIN
    //
    // TUYỆT ĐỐI KHÔNG rewrite
    //
    // accounts.google.com phải giữ nguyên.
    // ==================================================

    if (
      redirectUrl.hostname ===
      "accounts.google.com"
    ) {

      return redirectUrl.toString();

    }


    if (
      redirectUrl.hostname.endsWith(
        ".google.com"
      ) &&
      !redirectUrl.hostname.includes(
        "script.google.com"
      )
    ) {

      return redirectUrl.toString();

    }


    // ==================================================
    // 2. SCRIPT.GOOGLE.COM
    //
    // Đây là redirect của Apps Script.
    // Đưa nó trở lại route riêng.
    // ==================================================

    if (
      redirectUrl.hostname ===
      "script.google.com"
    ) {

      const newUrl =
        new URL(
          currentUrl.origin +
          appKey
        );


      newUrl.search =
        redirectUrl.search;


      /*
       * Nếu Google redirect tới:
       *
       * /macros/s/XXXX/exec
       *
       * hoặc các path phụ của Apps Script
       *
       * thì vẫn giữ chúng phía sau route.
       */

      const googlePath =
        redirectUrl.pathname;


      if (
        googlePath &&
        googlePath !== "/"
      ) {

        /*
         * Chỉ giữ phần path phụ,
         * không giữ /macros/s/ID/exec.
         */

        const match =
          googlePath.match(
            /^\/macros\/s\/[^/]+\/exec(\/.*)?$/
          );


        if (
          match &&
          match[1]
        ) {

          newUrl.pathname =
            appKey +
            match[1];

        }

      }


      return newUrl.toString();

    }


    // ==================================================
    // 3. Nếu redirect đã là domain của mình
    // ==================================================

    if (
      redirectUrl.hostname ===
      currentUrl.hostname
    ) {

      return redirectUrl.toString();

    }


    // ==================================================
    // 4. Các domain khác
    // giữ nguyên
    // ==================================================

    return redirectUrl.toString();

  }
  catch (err) {

    return location;

  }

}
