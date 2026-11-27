# Recorte de hojas de personaje

Scripts que convierten una hoja de personaje (4 secciones: vistas, 6 caras, 4 poses, vestimentas) en sprites WebP con fondo transparente para `app/public/personajes/`.

```
npm i sharp
node autoseg.mjs hoja.png sofia spec.json            # detecta figuras y escribe las cajas
node cut.mjs spec.json salida/ contacto.png          # recorta (quita fondo y sombra) y arma una hoja de control
```

`autoseg.mjs` arma una máscara de lo que no es fondo, la dilata, separa componentes conexos, descarta texto y asigna nombres por sección. Para Orki: `node autoseg.mjs hoja.png orki spec.json 0.555 0.5 tarabuco,cueca,bolivar,casual explora,sucre,bolivia,salta`.

Siempre revisar `contacto.png` antes de copiar los sprites a la app.
