# Delivery options

This project runs in a cloud workspace. A localhost address points to the machine hosting the browser, so a server inside this workspace is not reachable from the ChatGPT app on a phone. ChatGPT's attachment viewer may also block executable HTML or fail to expose workspace downloads.

The v1.2 Echo Ward release package uses:

- `release/PLAY-NIGHTMARE-v1.2.html`: one HTML file containing the game, Three.js, styles and procedural assets. Save it and open it in a WebGL 2 capable browser outside the ChatGPT file preview. No npm installation is needed.
- `release/nightmare-dead-zone-v1.2.zip`: all source, package/lock files, credits, tests and the playable HTML.
- `docs/index.html`: the same self-contained game prepared for static hosting, including GitHub Pages. It needs no server logic, keys or third-party runtime services.

The approved upload branch is `nightmare-touch-visibility-fixes` in `code-script-io/test-project`; v1.1 was delivered there previously. v1.2 files remain local build outputs until their upload succeeds. Check the delivery report for the verified commit/version. File creation does not publish a public site. If the files are uploaded to a GitHub branch, use the file page's **Download raw file** action for the HTML, or download the ZIP. GitHub's source-code viewer itself does not run the game.

For a browser demo, an owner can configure **Repository Settings → Pages → Deploy from a branch**, select `nightmare-touch-visibility-fixes` and `/docs`, then save. GitHub must confirm a successful deployment before the play URL can be considered available. Public Pages hosting and public repository visibility should be reviewed before enabling this. Free GitHub Pages availability depends on repository visibility and account plan.

The v1.2 package expands the game with the Echo Ward, the powered bell sequence **II → I → III**, a **12-second** noisy seal-opening holdout and the fourth ending, alongside layered room-aware procedural audio and physical hiding viewpoints. Readable lighting, the brightness slider and the repaired touch controls are retained. Reduced scares disables the optional apparition and soft lightning.

Browser permissions, WebGL support, device performance and local-file handling differ on actual Android devices. Tests emulate native touch in Chromium and exercise simultaneous movement, look and firing; they cannot certify every phone or embedded webview.

Audio graph and spatial-math tests can establish that synthesized effects are bounded, positioned and released correctly; they do not establish that a human has auditioned the sounds or rated them as realistic. No physical Android playtest is claimed.
