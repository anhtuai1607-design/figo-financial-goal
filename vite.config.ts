import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    // Máy chủ có trang báo lỗi thân thiện.
    tanstackStart({ server: { entry: "server" } }),
    // Khi build trên Vercel, Nitro tự dùng cấu hình Vercel.
    nitro(),
    viteReact(),
  ],
});
