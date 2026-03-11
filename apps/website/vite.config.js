import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        desarrolladores: resolve(__dirname, 'desarrolladores.html'),
        desarrollador: resolve(__dirname, 'desarrollador.html'),
        propiedades: resolve(__dirname, 'propiedades.html'),
        'propiedades-v2': resolve(__dirname, 'propiedades-v2.html'),
        propiedad: resolve(__dirname, 'propiedad.html'),
        blog: resolve(__dirname, 'blog.html'),
        articulo: resolve(__dirname, 'articulo.html'),
        invertir: resolve(__dirname, 'invertir.html'),
        'ai-insights': resolve(__dirname, 'ai-insights.html'),
        interes: resolve(__dirname, 'interes.html'),
      },
    },
  },
})
