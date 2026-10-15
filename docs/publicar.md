# Publicar SemioSim

**Estado actual:** publicada en <https://painnss.github.io/semiosim/> desde el repositorio `Painnss/semiosim` (rama `master`, raíz). Cada `git push` a `master` actualiza la web en 1-2 minutos.

SemioSim es un sitio estático: cualquier alojamiento de archivos sirve. Recomendado: **GitHub Pages** (gratis, HTTPS, sin servidor).

## GitHub Pages (una vez)
1. Crea un repositorio en GitHub (p. ej. `semiosim`) y sube este proyecto:
   ```bash
   git remote add origin https://github.com/TU-USUARIO/semiosim.git
   git push -u origin master
   ```
2. En el repositorio: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: master / (root)**.
3. En unos minutos la web queda en `https://TU-USUARIO.github.io/semiosim/`. El archivo `.nojekyll` evita que GitHub procese el sitio.

## Cada versión nueva
```bash
npm test                      # debe terminar en «módulos sin errores»
npm version patch --no-git-tag-version   # o edita "version" en package.json
npm run bump                  # actualiza ?v= en index.html y la caché del service worker
git add -A && git commit -m "v0.x.y: …" && git push
```
El `?v=` y el nombre de caché cambian con la versión, así los usuarios reciben la actualización sin limpiar caché.

## Alternativas
Netlify, Cloudflare Pages o Vercel: «arrastrar la carpeta» o conectar el repositorio; sin configuración (no hay build).

## Antes de abrirla al público
- Revisión del contenido por un docente de semiología.
- Aviso visible de herramienta educativa (ya está en el pie y en la portada).
- Dominio propio (opcional) y un canal para reportar errores (Issues de GitHub).
- Si se añaden grabaciones de audio: solo con licencia CC0/CC BY y atribución en `audio/manifest.json`.
