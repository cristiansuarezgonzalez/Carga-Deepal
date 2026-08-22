import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El base debe coincidir EXACTAMENTE (mayúsculas incluidas) con el nombre
// del repositorio de GitHub: https://cristiansuarezgonzalez.github.io/Carga-Deepal/
export default defineConfig({
  plugins: [react()],
  base: '/Carga-Deepal/'
});
