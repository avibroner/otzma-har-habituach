module.exports = {
  apps: [
    {
      name: "har-habituach",
      script: ".next/standalone/server.js",
      env: {
        PORT: 3100,
        HOSTNAME: "0.0.0.0",
      },
    },
  ],
};
