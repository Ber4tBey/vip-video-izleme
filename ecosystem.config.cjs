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
      name: "vip-video-frontend",
      script: "node_modules/serve/build/main.js",
      args: "-s dist -l 5173", // Use port 5173, PM2 serve works well using `serve` package. 
      cwd: ".",
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
