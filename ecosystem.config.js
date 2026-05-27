module.exports = {
  apps: [
    {
      name: "disciplina-app",
      script: "server.js",
      cwd: "C:/Users/quadr/Downloads/disciplina-app/disciplina-app",
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
