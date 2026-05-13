import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

/** Директория проекта (нужна turbopack.root при нескольких lockfile в родительских каталогах). */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
