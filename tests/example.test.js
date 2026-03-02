module.exports = {
  tests: [
    {
      name: "example: inline page content",
      fn: async (page) => {
        await page.setContent(`
          <html>
            <head>
              <title>MyTest Example</title>
            </head>
            <body>
              <h1 id="greeting">Hello from MyTest</h1>
            </body>
          </html>
        `);

        const text = await page.textContent("#greeting");
        if (text !== "Hello from MyTest") {
          throw new Error(`Unexpected greeting text: ${text}`);
        }
      }
    }
  ]
};

