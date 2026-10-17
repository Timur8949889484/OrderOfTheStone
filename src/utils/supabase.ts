// src/utils/supabase.ts
import { createClient } from "@supabase/supabase-js";

// Забираем ключи из твоего .env файла
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Отсутствуют ключи Supabase в файле .env");
}

// Экспортируем готовый клиент для использования в компонентах
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
