/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	// agent-browser and some clients use 127.0.0.1 while Next prints localhost — avoid blocked dev origins
	allowedDevOrigins: ["127.0.0.1"],
	images: {
		remotePatterns: [
			{ protocol: "https", hostname: "images.unsplash.com" },
			{ protocol: "https", hostname: "picsum.photos" },
			{ protocol: "https", hostname: "youtu.be" },
			{ protocol: "https", hostname: "yt3.ggpht.com", pathname: "/**" },
			{ protocol: "https", hostname: "storage.cloud.google.com" },
			{ protocol: "https", hostname: "firebasestorage.googleapis.com" },
			{ protocol: "https", hostname: "lh3.googleusercontent.com" },
			{ protocol: "https", hostname: "graph.facebook.com" },
			{ protocol: "https", hostname: "platform-lookaside.fbsbx.com" },
			{ protocol: "https", hostname: "pbs.twimg.com" },
			{ protocol: "https", hostname: "abs.twimg.com" },
			{ protocol: "https", hostname: "images.ctfassets.net" },
			{ protocol: "https", hostname: "res.cloudinary.com" },
			{ protocol: "https", hostname: "img.clerk.com" },
			{ protocol: "https", hostname: "i.ytimg.com" },
		],
	},
	turbopack: {
		root: "/Users/jakwakwa/Repos/stratcol-apps/Scol-Control-Tower",
	},
	skipTrailingSlashRedirect: true,
	async rewrites() {
		return [
			{
				source: "/ingest/static/:path*",
				destination: "https://us-assets.i.posthog.com/static/:path*",
			},
			{
				source: "/ingest/:path*",
				destination: "https://us.i.posthog.com/:path*",
			},
		];
	},
	async headers() {
		const clerkHosts = ["enabled-doe-20.accounts.dev/sign-in"];

		const extraHosts = [
			"https://enabled-doe-20.accounts.dev/sign-in",
			"https://va.vercel-scripts.com",
			"https://vercel.live",
		];

		const csp = {
			"default-src": ["'self'"],
			"script-src": [
				"'self'",
				"'unsafe-eval'",
				"'unsafe-inline'",
				...clerkHosts.map((h) => `https://${h}`),
				"https://*.clerk.accounts.dev",
				...extraHosts,
			],
			"style-src": ["'self'", "'unsafe-inline'"],
			"img-src": [
				"'self'",
				"data:",
				"images.unsplash.com",
				"picsum.photos",
				"youtu.be",
				"yt3.ggpht.com",
				"storage.cloud.google.com",
				"storage.googleapis.com",
				"firebasestorage.googleapis.com",
				"lh3.googleusercontent.com",
				"graph.facebook.com",
				"platform-lookaside.fbsbx.com",
				"pbs.twimg.com",
				"abs.twimg.com",
				"images.ctfassets.net",
				"res.cloudinary.com",
				"img.clerk.com",
				"via.placeholder.com",
				"i.ytimg.com",
			],
			"font-src": ["'self'", "https://fonts.gstatic.com"],
			"media-src": [
				"'self'",
				"blob:",
				"https://storage.googleapis.com",
				"https://storage.cloud.google.com",
				"*.googleusercontent.com",
				"https://*.googleapis.com",
				"https://*.google.com",
			],
			"connect-src": [
				"'self'",
				...clerkHosts.map((h) => `https://${h}`),
				"https://*.clerk.accounts.dev",
				"https://clerk-telemetry.com",
				"https://vitals.vercel-insights.com",
				"*.googleusercontent.com",
				"https://*.posthog.com",
				"https://us.i.posthog.com",
				"https://us-assets.i.posthog.com",
			],
			"object-src": ["'none'"],
			"base-uri": ["'self'"],
			"form-action": ["'self'"],
			"frame-ancestors": ["'self'"],
			"upgrade-insecure-requests": [],
		};

		const cspHeader = Object.entries(csp)
			.map(([key, value]) => {
				if (value.length === 0) {
					return key;
				}
				return `${key} ${value.join(" ")}`;
			})
			.join("; ");

		return [
			{
				source: "/(.*)",
				headers: [
					{
						key: "Content-Security-Policy",
						value: cspHeader,
					},
				],
			},
		];
	},
};

export default nextConfig;
