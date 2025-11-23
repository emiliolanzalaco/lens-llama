/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { isServer }) => {
        // Don't externalize sharp - it needs to be bundled for Vercel
        // Suppress OpenTelemetry dynamic require warnings from Synapse SDK
        config.ignoreWarnings = [
            { module: /@opentelemetry\/instrumentation/ },
            { module: /require-in-the-middle/ },
        ];

        return config;
    },
};

export default nextConfig;
