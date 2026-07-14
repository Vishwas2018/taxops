import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silences Turbopack's workspace-root inference warning (source of the audit's stray "1
  // Issue" dev-tools indicator - see PROGRESS.md Day 12). The parent `KeepMore/` directory
  // holds an unrelated, empty `package-lock.json` from outside this repo; without an explicit
  // root, Turbopack finds both lockfiles and guesses wrong.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
