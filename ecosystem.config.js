module.exports = {
  apps: [
    {
      name: "dev-trimmers-be-5002",
      //cwd: "/var/www/trimmers-dev/app",
      script: "npm run start",
      //args: "server.js",
      watch: true,                // more stable on servers
      //instances: "max",            // or 1 if you prefer single instance
      //exec_mode: "cluster",        // zero-downtime reloads
      env: {
        NODE_ENV: "prod",
        PORT: 5002
      }
    }
  ]
};
