module.exports = {
  apps: [
    {
      name: "disciplina-app",
      script: "node_modules/next/dist/bin/next",
      args: "start",
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
