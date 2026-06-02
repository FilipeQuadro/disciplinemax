const path = require("path");

module.exports = {
  apps: [
    {
      name: "disciplina-app",
      script: "server.js",
      cwd: __dirname,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
