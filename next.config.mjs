/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  serverExternalPackages: ["@mysten-incubation/memwal"],
  // evidence.jsonl and FACTS.json are read at request time by /proof, /api/stats and the landing page
  outputFileTracingIncludes: { "/*": ["./docs/evidence.jsonl", "./docs/FACTS.json"] },
};
