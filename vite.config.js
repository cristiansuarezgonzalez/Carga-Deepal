import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// IMPORTANTE: cambia "deepal-tracker" por el nombre EXACTO de tu repositorio
// de GitHub si es distinto. Debe coincidir con la URL:
// https://tu-usuario.github.io/NOMBRE-DEL-REPO/
export default defineConfig({
  plugins: [react()],
  base: '/deepal-tracker/'
});
