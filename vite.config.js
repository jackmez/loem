import { defineConfig } from "vite";
import { resolve } from "node:path";

const cleanRouteTargets = new Map([
  ["/brand-story", "/brand-story.html"],
  ["/brand-story/", "/brand-story.html"],
  ["/lookbook", "/lookbook.html"],
  ["/lookbook/", "/lookbook.html"],
]);

function cleanHtmlRoutes() {
  const rewrite = (req, _res, next) => {
    const [pathname, query] = (req.url || "").split("?");
    const target = cleanRouteTargets.get(pathname);
    if (target) {
      req.url = query ? `${target}?${query}` : target;
    }
    next();
  };

  return {
    name: "clean-html-routes",
    configureServer(server) {
      server.middlewares.use(rewrite);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite);
    },
  };
}

export default defineConfig({
  plugins: [cleanHtmlRoutes()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        brandStory: resolve(__dirname, "brand-story.html"),
        lookbook: resolve(__dirname, "lookbook.html"),
      },
    },
  },
});
