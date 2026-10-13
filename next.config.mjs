/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Cho phép build thành công ngay cả khi có lỗi ESLint
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;