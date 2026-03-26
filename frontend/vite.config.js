import { defineConfig } from "vite";

export default defineConfig({
  server: {
    allowedHosts: ['.ngrok-free.dev'],
    proxy: {
      "/socket.io": {
        target: "http://localhost:3000",
        ws: true,
      },
    },
  },
});
