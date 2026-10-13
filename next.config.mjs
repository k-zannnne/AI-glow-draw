

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Tắt kiểm tra lỗi ESLint khi build trên Vercel
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;