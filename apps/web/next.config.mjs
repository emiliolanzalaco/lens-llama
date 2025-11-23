/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { isServer }) => {
        if (isServer) {
            config.externals = [...(config.externals || []), 'sharp'];
        }

        // Suppress OpenTelemetry dynamic require warnings from Synapse SDK
        config.ignoreWarnings = [
            { module: /@opentelemetry\/instrumentation/ },
            { module: /require-in-the-middle/ },
        ];

        return config;
    },
};

export default nextConfig;
