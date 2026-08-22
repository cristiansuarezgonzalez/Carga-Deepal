# Deepal S07 REEV · Control de energía

App para registrar cargas eléctricas (kWh) y de combustible (galones) del Deepal S07 REEV, con control mensual y anual de gasto en pesos colombianos.

Los datos se guardan en `localStorage` del navegador: quedan solo en el dispositivo donde los registres (no se sincronizan entre dispositivos).

## Publicar en GitHub Pages

1. **Crea un repositorio nuevo en GitHub** (por ejemplo `deepal-tracker`) y sube esta carpeta:

   ```bash
   cd deepal-tracker
   git init
   git add .
   git commit -m "Deepal tracker inicial"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/deepal-tracker.git
   git push -u origin main
   ```

2. **Ajusta `vite.config.js`** si tu repositorio NO se llama `deepal-tracker`: cambia la línea `base: '/deepal-tracker/'` por `base: '/NOMBRE-DE-TU-REPO/'`.

3. **Activa GitHub Pages con Actions**:
   - Ve a tu repo en GitHub → **Settings** → **Pages**
   - En "Build and deployment" → "Source", selecciona **GitHub Actions**
   - Con cada `push` a `main`, el workflow (`.github/workflows/deploy.yml`) construye y publica el sitio automáticamente.

4. Tras el primer despliegue (revisa la pestaña **Actions** para ver el progreso), tu app quedará disponible en:

   ```
   https://TU-USUARIO.github.io/deepal-tracker/
   ```

## Desarrollo local

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`.

## Build manual (opcional)

```bash
npm run build
npm run preview
```
