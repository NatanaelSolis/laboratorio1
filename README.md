# Laboratorio 2: inventario de productos y categorías

Responsable del proyecto: **Natanael Solis**.

Aplicación Angular 17 con una API Spring Boot, PostgreSQL y autenticación con Keycloak. Permite consultar productos y categorías. El administrador también puede crearlos, editarlos, eliminarlos y consultar usuarios. Las cuentas nuevas reciben el rol USER.

Referencia del backend original: https://github.com/ginocenfo/Persistencia-proyecto-3-c3.

## Requisitos

- IntelliJ IDEA con soporte para Java y Node.js.
- JDK 25, Node.js 20 y npm.
- Docker Desktop iniciado.

## Ejecutar desde IntelliJ IDEA

1. Abrir la carpeta que contiene `pom.xml` y `package.json`.
2. Seleccionar JDK 25 como SDK del proyecto y recargar Maven.
3. Abrir `docker/compose.yaml` y ejecutar todos sus servicios con el icono de Docker Compose. Esperar a que PostgreSQL y Keycloak estén disponibles.
4. Ejecutar `Laboratorio1Application` con el botón Run.
5. Abrir `package.json`, instalar las dependencias npm y ejecutar el script `start`.
6. Abrir http://localhost:4200.

La API utiliza http://localhost:8080 y Keycloak http://localhost:8180. PostgreSQL del inventario está en `localhost:5433`. Los servicios se publican solo en la computadora local y los datos se conservan en volúmenes de Docker.

Para compilar el frontend, ejecutar el script `build` de `package.json`. Para compilar y probar el backend, ejecutar `package` desde el panel Maven. Con los servicios iniciados, abrir `pruebas.http` y seleccionar **Run All Requests**. Las pruebas crean datos propios, eliminan su producto y categoría al terminar y conservan la cuenta registrada.

## Cuentas de prueba

| Rol | Usuario | Contraseña |
| --- | --- | --- |
| SUPER-ADMIN-ROLE | admin | AdminLab123! |
| USER | usuario | UsuarioLab123! |

Estas credenciales son para el laboratorio local. Las cuentas de la aplicación pertenecen al realm `laboratorio1`. La consola de Keycloak usa `admin` / `admin` en el realm `master`.

## Organización

- `src/app/acceso.ts`: inicio de sesión y registro.
- `src/app/core.ts`: sesión, permisos de navegación, token HTTP y mensajes de error.
- `src/app/catalogo.ts`: listas y formulario compartido para productos y categorías.
- `src/app/app.ts`: menú, rutas y consulta de usuarios.
- `src/main.ts`, `src/index.html` y `src/styles.css`: inicio y presentación de Angular.
- `src/main/java`: controladores, servicios, entidades, repositorios y seguridad de la API.
- `src/main/resources/application.properties`: conexión a PostgreSQL y Keycloak.
- `docker`: servicios locales y configuración inicial de Keycloak.
- `pruebas.http` y `src/test`: comprobaciones de la API y del backend.
