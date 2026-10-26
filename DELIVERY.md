# Delivery options

This project runs in a cloud workspace. A localhost address points to the machine hosting the browser, so a server inside this workspace is not reachable from the ChatGPT app on a phone. ChatGPT's attachment viewer may also block executable HTML or fail to expose workspace downloads.

The prepared v1.1 release contains:

- `release/PLAY-NIGHTMARE-v1.1.html`: one HTML file containing the game, Three.js, styles and procedural assets. Save it and open it in a WebGL 2 capable browser outside the ChatGPT file preview. No npm installation is needed.
- `release/nightmare-dead-zone-v1.1.zip`: all source, package/lock files, credits, tests and the playable HTML.
- `docs/index.html`: the same self-contained game prepared for static hosting, including GitHub Pages. It needs no server logic, keys or third-party runtime services.

These are local build outputs until they are uploaded. File creation does not publish a public site. If the files are uploaded to a GitHub branch, use the file page's **Download raw file** action for the HTML, or download the ZIP. GitHub's source-code viewer itself does not run the game.

For a browser demo, an owner can configure **Repository Settings → Pages → Deploy from a branch**, select the uploaded branch and `/docs`, then save. GitHub must confirm a successful deployment before the play URL can be considered available. Public Pages hosting and public repository visibility should be reviewed before enabling this. Free GitHub Pages availability depends on repository visibility and account plan.

Browser permissions, WebGL support, device performance and local-file handling differ on actual Android devices. Tests emulate native touch in Chromium and exercise simultaneous movement, look and firing; they cannot certify every phone or embedded webview.
