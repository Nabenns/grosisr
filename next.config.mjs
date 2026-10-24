/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  images: { remotePatterns: [] },
  // ESLint during `next build` is disabled on purpose: eslint-config-next pulls
  // react-hooks v6 rules (e.g. `react-hooks/incompatible-library`) that flag
  // normal react-hook-form `watch()` usage. Type safety is enforced separately
  // by `pnpm tsc --noEmit` in CI.
  eslint: { ignoreDuringBuilds: true }
}
export default nextConfig
