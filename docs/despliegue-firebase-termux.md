# Despliegue inicial de Firebase para INGEST

El repositorio apunta exclusivamente al proyecto Firebase `ingest-manu` mediante `.firebaserc`.

## Servicios que deben habilitarse en Firebase Console

1. En Authentication, habilitar el proveedor **Correo electrónico/Contraseña**.
2. No se agregará registro público desde la aplicación.
3. En Firestore Database, crear la base en modo **Native** y elegir la región definitiva.
4. Crear manualmente el primer usuario administrador en Authentication.
5. Crear manualmente su perfil en Firestore en `usuarios/{uid}` con `rol: "admin"`.

## Despliegue desde Termux

```bash
cd ~/INGEST
npx firebase-tools login --no-localhost
npx firebase-tools use ingest-manu
npx firebase-tools deploy --only firestore:rules,firestore:indexes --project ingest-manu
```

Las reglas iniciales mantienen todas las colecciones cerradas. Solo permiten perfiles autenticados y administración de `_meta` después de que exista un perfil con `rol: "admin"`.

No se deben compartir tokens, contraseñas ni archivos de cuenta de servicio.
