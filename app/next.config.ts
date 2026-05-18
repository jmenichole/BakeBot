import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
    outputFileTracingRoot: path.join(__dirname, ".."),
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'xqshkiygkyxadksvggks.supabase.co',
                port: '',
                pathname: '/storage/v1/object/public/**',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'api.stability.ai',
            }
        ],
    },
    experimental: {
        // Disable server actions body size limit if needed for large uploads, 
        // but Keeping it default for security unless requested.
    },
    // Ensure development mode doesn't crash on hydration mismatches from social widgets
    reactStrictMode: true,
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on'
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload'
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN'
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff'
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'origin-when-cross-origin'
                    }
                ]
            }
        ];
    },
};

export default nextConfig;
