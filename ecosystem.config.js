module.exports = {
  apps: [
    {
      name: "disciplina-app",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
      },
      watch: false,
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
