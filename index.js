const DASHBOARD_GIAO_DICH =
  "https://script.google.com/macros/s/AKfycbzkpy8_3PojvNGf9_wZrIJMKcQ9_U9ww3l7pcvQpRgL6_FIHA_hS9D_I20YQ3gFPXxVdw/exec";

const DASHBOARD_COC_NO =
  "https://script.google.com/macros/s/AKfycbwzKHlRArkUlaBBtiNSZDsAZi3OYlAaq1t3ECssJo5jOmF89VuDFd2OdI1WmtGlqQ5f/exec";


export default {

  async fetch(request) {

    const url =
      new URL(request.url);

    const path =
      url.pathname;


    /************************************************
     * TRANG CHỦ
     ************************************************/

    if (
      path === "/" ||
      path === ""
    ) {

      return new Response(
        HOME_PAGE,
        {
          headers: {
            "content-type":
              "text/html; charset=UTF-8",

            "cache-control":
              "no-store"
          }
        }
      );

    }


    /************************************************
     * DASHBOARD GIAO DỊCH
     ************************************************/

    if (
      path === "/giao-dich" ||
      path.startsWith("/giao-dich/")
    ) {

      return proxyGoogleApp_(
        request,
        DASHBOARD_GIAO_DICH,
        "/giao-dich"
      );

    }


    /************************************************
     * DASHBOARD CỌC & NỢ
     ************************************************/

    if (
      path === "/coc-no" ||
      path.startsWith("/coc-no/")
    ) {

      return proxyGoogleApp_(
        request,
        DASHBOARD_COC_NO,
        "/coc-no"
      );

    }


    /************************************************
     * 404
     ************************************************/

    return new Response(
      "Không tìm thấy trang.",
      {
        status: 404,
        headers: {
          "content-type":
            "text/plain; charset=UTF-8"
        }
      }
    );

  }

};


/****************************************************
 * PROXY GOOGLE APPS SCRIPT
 ****************************************************/

async function proxyGoogleApp_(
  request,
  target,
  basePath
) {

  const incomingUrl =
    new URL(request.url);

  const targetUrl =
    new URL(target);


  /**************************************************
   * GIỮ QUERY STRING
   **************************************************/

  incomingUrl.searchParams.forEach(
    (value, key) => {

      targetUrl.searchParams.set(
        key,
        value
      );

    }
  );


  /**************************************************
   * REQUEST TỚI GOOGLE
   **************************************************/

  const headers =
    new Headers(request.headers);


  headers.set(
    "User-Agent",
    "Mozilla/5.0"
  );


  headers.set(
    "Accept",
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
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
          request.method === "GET" ||
          request.method === "HEAD"
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


  /**************************************************
   * XỬ LÝ REDIRECT
   *
   * Google Apps Script thường redirect.
   **************************************************/

  let redirectCount = 0;


  while (
    response.status >= 300 &&
    response.status < 400 &&
    response.headers.get("location") &&
    redirectCount < 10
  ) {

    const location =
      response.headers.get(
        "location"
      );


    const redirectUrl =
      new URL(
        location,
        targetUrl
      );


    response =
      await fetch(
        new Request(
          redirectUrl.toString(),
          {
            method:
              request.method,

            headers:
              headers,

            body:
              request.method === "GET" ||
              request.method === "HEAD"
                ? undefined
                : request.body,

            redirect:
              "manual"
          }
        )
      );


    redirectCount++;

  }


  /**************************************************
   * TRẢ RESPONSE VỀ CLIENT
   **************************************************/

  const newHeaders =
    new Headers(
      response.headers
    );


  newHeaders.delete(
    "content-security-policy"
  );


  newHeaders.delete(
    "content-security-policy-report-only"
  );


  newHeaders.delete(
    "x-frame-options"
  );


  newHeaders.delete(
    "content-encoding"
  );


  newHeaders.set(
    "cache-control",
    "no-store"
  );


  const contentType =
    response.headers.get(
      "content-type"
    ) || "";


  /**************************************************
   * NẾU HTML
   *
   * Sửa các URL Google trong HTML
   * để quay về devone.top.
   **************************************************/

  if (
    contentType.includes(
      "text/html"
    )
  ) {

    let html =
      await response.text();


    html =
      rewriteGoogleUrls_(
        html,
        incomingUrl.origin,
        basePath
      );


    return new Response(
      html,
      {
        status:
          response.status,

        headers:
          newHeaders
      }
    );

  }


  return new Response(
    response.body,
    {
      status:
        response.status,

      headers:
        newHeaders
    }
  );

}


/****************************************************
 * REWRITE URL
 ****************************************************/

function rewriteGoogleUrls_(
  html,
  origin,
  basePath
) {

  const googleHosts = [
    "https://script.google.com",
    "https://script.googleusercontent.com",
    "https://accounts.google.com"
  ];


  for (
    const host of googleHosts
  ) {

    html =
      html.replaceAll(
        host,
        origin + basePath
      );

  }


  return html;

}


/****************************************************
 * TRANG CHỦ
 ****************************************************/

const HOME_PAGE = `
<!DOCTYPE html>

<html lang="vi">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
>

<title>DevOne Dashboard</title>

<style>

* {
  box-sizing: border-box;
}

html,
body {

  margin: 0;

  padding: 0;

  min-height: 100%;

  font-family:
    Inter,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

}

body {

  background:
    linear-gradient(
      135deg,
      #0f172a,
      #172554
    );

  color: #ffffff;

  min-height: 100vh;

  display: flex;

  align-items: center;

  justify-content: center;

  padding: 24px;

}


.container {

  width: 100%;

  max-width: 900px;

}


.header {

  text-align: center;

  margin-bottom: 42px;

}


.logo {

  width: 72px;

  height: 72px;

  margin:
    0 auto 18px;

  border-radius: 20px;

  background:
    linear-gradient(
      135deg,
      #2563eb,
      #06b6d4
    );

  display: flex;

  align-items: center;

  justify-content: center;

  font-size: 32px;

  box-shadow:
    0 20px 50px
    rgba(0,0,0,.25);

}


h1 {

  margin: 0;

  font-size: 34px;

  font-weight: 800;

}


.subtitle {

  margin-top: 10px;

  color: #cbd5e1;

  font-size: 16px;

}


.cards {

  display: grid;

  grid-template-columns:
    repeat(2, 1fr);

  gap: 22px;

}


.card {

  position: relative;

  overflow: hidden;

  text-decoration: none;

  color: #ffffff;

  padding: 30px;

  min-height: 230px;

  border-radius: 24px;

  background:
    rgba(255,255,255,.09);

  border:
    1px solid
    rgba(255,255,255,.15);

  backdrop-filter:
    blur(18px);

  transition:
    transform .2s ease,
    background .2s ease,
    box-shadow .2s ease;

}


.card:hover {

  transform:
    translateY(-6px);

  background:
    rgba(255,255,255,.14);

  box-shadow:
    0 25px 60px
    rgba(0,0,0,.25);

}


.icon {

  width: 58px;

  height: 58px;

  border-radius: 16px;

  display: flex;

  align-items: center;

  justify-content: center;

  font-size: 28px;

  margin-bottom: 22px;

}


.blue {

  background:
    rgba(37,99,235,.3);

}


.green {

  background:
    rgba(16,185,129,.3);

}


.card h2 {

  margin: 0 0 10px;

  font-size: 22px;

}


.card p {

  margin: 0;

  color: #cbd5e1;

  line-height: 1.6;

}


.arrow {

  position: absolute;

  right: 25px;

  bottom: 22px;

  font-size: 24px;

  opacity: .7;

}


.footer {

  text-align: center;

  margin-top: 35px;

  color: #94a3b8;

  font-size: 13px;

}


@media (
  max-width: 700px
) {

  .cards {

    grid-template-columns:
      1fr;

  }

  h1 {

    font-size: 28px;

  }

}

</style>

</head>


<body>

<div class="container">


  <div class="header">

    <div class="logo">
      📊
    </div>

    <h1>
      DevOne Dashboard
    </h1>

    <div class="subtitle">
      Hệ thống quản lý & tra cứu dữ liệu
    </div>

  </div>


  <div class="cards">


    <a
      class="card"
      href="/giao-dich"
    >

      <div
        class="icon blue"
      >
        🔎
      </div>

      <h2>
        Dashboard Giao Dịch
      </h2>

      <p>
        Tra cứu và phân tích
        giao dịch theo ngày,
        từ khóa và trạng thái.
      </p>

      <div class="arrow">
        →
      </div>

    </a>


    <a
      class="card"
      href="/coc-no"
    >

      <div
        class="icon green"
      >
        💰
      </div>

      <h2>
        Dashboard Cọc & Nợ
      </h2>

      <p>
        Theo dõi cọc chưa dùng
        và các khoản công nợ
        hiện tại.
      </p>

      <div class="arrow">
        →
      </div>

    </a>


  </div>


  <div class="footer">

    DevOne • Dashboard System

  </div>


</div>

</body>

</html>
`;
