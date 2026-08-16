const APPS = {
  "/giao-dich":
    "https://script.google.com/macros/s/AKfycbzkpy8_3PojvNGf9_wZrIJMKcQ9_U9ww3l7pcvQpRgL6_FIHA_hS9D_I20YQ3gFPXxVdw/exec",

  "/coc-no":
    "https://script.google.com/macros/s/AKfycbwzKHlRArkUlaBBtiNSZDsAZi3OYlAaq1t3ECssJo5jOmF89VuDFd2OdI1WmtGlqQ5f/exec"
};


export default {

  async fetch(request) {

    const url =
      new URL(request.url);


    /************************************************
     * TRANG CHỦ
     ************************************************/

    if (
      url.pathname === "/" ||
      url.pathname === ""
    ) {

      return new Response(
        `
        <!DOCTYPE html>

        <html lang="vi">

        <head>

          <meta charset="UTF-8">

          <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
          >

          <title>DevOne Dashboard</title>

        </head>

        <body>

          <h1>DevOne Dashboard</h1>

          <p>
            <a href="/giao-dich">
              📊 Dashboard Giao Dịch
            </a>
          </p>

          <p>
            <a href="/coc-no">
              💰 Dashboard Cọc & Nợ
            </a>
          </p>

        </body>

        </html>
        `,
        {
          headers: {
            "Content-Type":
              "text/html; charset=UTF-8"
          }
        }
      );

    }


    /************************************************
     * XÁC ĐỊNH APP
     ************************************************/

    let appKey = null;

    for (
      const key of Object.keys(APPS)
    ) {

      if (
        url.pathname === key ||
        url.pathname.startsWith(key + "/")
      ) {

        appKey = key;
        break;

      }

    }


    if (!appKey) {

      return new Response(
        "Not Found",
        {
          status: 404
        }
      );

    }


    /************************************************
     * URL GOOGLE THẬT
     ************************************************/

    const googleUrl =
      new URL(APPS[appKey]);


    /*
     * Giữ nguyên query string
     *
     * Ví dụ:
     *
     * ?foo=bar
     *
     * sẽ được chuyển sang Google.
     */

    googleUrl.search =
      url.search;


    /************************************************
     * REQUEST SANG GOOGLE
     ************************************************/

    const headers =
      new Headers(
        request.headers
      );


    /*
     * Xóa các header host của domain mình
     */

    headers.delete("host");


    const googleRequest =
      new Request(
        googleUrl.toString(),
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


    /************************************************
     * GỌI GOOGLE
     ************************************************/

    let response =
      await fetch(
        googleRequest
      );


    /************************************************
     * XỬ LÝ REDIRECT
     *
     * ĐÂY LÀ PHẦN QUAN TRỌNG NHẤT
     ************************************************/

    const responseHeaders =
      new Headers(
        response.headers
      );


    const location =
      responseHeaders.get(
        "Location"
      );


    if (location) {

      try {

        const redirectUrl =
          new URL(
            location,
            googleUrl
          );


        /*
         * Google redirect về:
         *
         * script.google.com
         *
         * hoặc
         *
         * accounts.google.com
         *
         */


        if (
          redirectUrl.hostname ===
          "script.google.com"
        ) {

          /*
           * Chỉ đổi host.
           *
           * KHÔNG đổi pathname.
           */

          redirectUrl.hostname =
            url.hostname;


          responseHeaders.set(
            "Location",
            redirectUrl.toString()
          );

        }

      }
      catch (error) {

        console.error(
          "Không xử lý được Location:",
          location
        );

      }

    }


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
