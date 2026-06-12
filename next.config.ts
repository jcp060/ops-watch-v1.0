import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/flights", destination: "/", permanent: false },
      { source: "/aircraft", destination: "/settings/aircraft", permanent: false },
      {
        source: "/organizations",
        destination: "/settings/organizations",
        permanent: false,
      },
      { source: "/users", destination: "/settings/users", permanent: false },
    ];
  },
};

export default nextConfig;
