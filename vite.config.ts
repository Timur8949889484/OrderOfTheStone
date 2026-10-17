import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  // ВАЖНО: Замени 'minecraft' на реальное название твоего репозитория на GitHub!
  // Обязательно оставь слеши в начале и в конце: '/название/'
  base: "/OrderOfTheStone/",

  plugins: [react()],
  server: {
    host: true, // <-- открывает доступ для всех устройств в сети
  },
});
