# Base de datos (Supabase)

Los datos de la app (servicios, preparaciones, ingredientes, pedidos y préstamos) viven en
Supabase. En este repo está el script que crea las tablas: `schema.sql`.

## Tablas

| Tabla | Qué guarda |
| --- | --- |
| `servicios` | Cada almuerzo o cena de un día (fecha + turno) |
| `preparaciones` | Platos del menú de un servicio: cantidad, precio, costo por plato |
| `ingredientes` | Lo que se compró y se usó en cada preparación |
| `pedidos` | Cliente, plato, cantidad y si ya pagó |
| `prestamos` | Dinero prestado al negocio y si ya se devolvió |

Solo los usuarios con sesión iniciada pueden leer y escribir (Row Level Security).

## Configuración (una sola vez)

1. Crear un proyecto en https://supabase.com (plan gratuito).
2. **SQL Editor → New query**: pegar `schema.sql` y presionar **Run**.
3. **Authentication → Users → Add user**: crear un usuario para Samuel y otro para Luisa
   (correo + contraseña, marcar *Auto Confirm User*).
4. **Authentication → Sign In / Providers**: desactivar *Allow new users to sign up*
   para que nadie más pueda crear cuenta.
5. **Project Settings → API**: copiar *Project URL* y la llave *anon public*.
6. En GitHub: **Settings → Secrets and variables → Actions → Variables** crear
   `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con esos valores.
7. Volver a ejecutar el workflow *Publicar en GitHub Pages* (pestaña Actions).

Para desarrollo local, crear un archivo `.env.local` con las mismas dos variables.
Sin ellas, la app funciona en modo local y guarda los datos solo en el navegador.
