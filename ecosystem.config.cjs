module.exports = {
    apps: [
        {
            name: "colegio-backend",
            script: "./server/index.js",
            env: {
                NODE_ENV: "production",
                PORT: 3001
            }
        },
        {
            name: "colegio-frontend",
            script: "npm",
            args: "run dev", // Or 'run preview' if built
            env: {
                PORT: 5173
            }
        }
    ]
};
