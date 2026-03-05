module.exports = {
  apps: [
    {
      name: "vip-video-backend",
      script: "server.js",
      cwd: "./backend",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 3001
      }
    },
    {
      name: "vip-video-proxy",
      script: "server.js",
      cwd: ".", // Ana dizin
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 80 // Frontend isteklerini alacağı ana port (80)
      }
    }
  ]
};
