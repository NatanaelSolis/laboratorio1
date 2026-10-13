# Laboratorio 1 - CRUD Backend

CRUD de categorías y productos con Spring Boot, Spring Data JPA, MySQL, MapStruct y autenticación JWT mediante Keycloak.

Referencia utilizada: https://github.com/ginocenfo/Persistencia-proyecto-3-c3

## Requisitos

- JDK 25 configurado en JAVA_HOME.
- Docker Desktop en ejecución.
- Postman.

Ejecutar los siguientes comandos desde la raíz del proyecto, en PowerShell.

## Primera ejecución

### 1. Iniciar MySQL

```powershell
docker compose -f docker/compose.yaml up -d db
docker compose -f docker/compose.yaml logs -f db
```

Esperar el mensaje `ready for connections` y pulsar Ctrl + C para salir de los registros. El contenedor seguirá funcionando.

### 2. Preparar la base de Keycloak

```powershell
docker compose -f docker/compose.yaml exec db mysql -u root -p
```

Introducir la contraseña de `MYSQL_ROOT_PASSWORD` definida en `docker/compose.yaml`.

Dentro de MySQL, ejecutar:

```sql
CREATE DATABASE IF NOT EXISTS keycloak
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'keycloak_app'@'%'
IDENTIFIED BY 'KeycloakDb123!';

GRANT ALL PRIVILEGES ON keycloak.* TO 'keycloak_app'@'%';

EXIT;
```

### 3. Iniciar Keycloak

```powershell
docker compose -f docker/compose.yaml up -d keycloak
docker compose -f docker/compose.yaml logs -f keycloak
```

Esperar a que termine de iniciar. Después, pulsar Ctrl + C para salir de los registros.

Se importa el realm `laboratorio1` con los usuarios y roles de prueba.

### 4. Iniciar el backend

Comprobar que Maven utiliza Java 25:

```powershell
.\mvnw.cmd -v
```

Ejecutar la aplicación:

```powershell
.\mvnw.cmd clean spring-boot:run
```

Mantener esta terminal abierta durante las pruebas.

## Servicios

- API: http://localhost:8080
- Keycloak: http://localhost:8180
- MySQL: localhost:3307
- Realm: `laboratorio1`
- Client ID: `laboratorio1-api`
- Origen CORS permitido: `http://localhost:4200`

## Usuarios locales de prueba

| Usuario | Contraseña | Rol |
|---|---|---|
| admin | AdminLab123! | SUPER-ADMIN-ROLE |
| usuario | UsuarioLab123! | USER |

Ambos usuarios pueden consultar. Solo el administrador puede crear, actualizar y eliminar categorías y productos.

## Colección de Postman

Importar `Laboratorio1.postman_collection.json`.

Ejecutar las carpetas en este orden:

1. 00 Autenticacion
2. 01 Categorias
3. 02 Productos
4. 03 Permisos
5. 04 Borrado
6. 05 CORS

Los scripts guardan automáticamente los tokens y los IDs en variables de la colección. No se necesita un environment.

Las pruebas de permisos esperan 403. Los borrados autorizados esperan 204; primero se elimina el producto y después la categoría.

La aplicación no precarga categorías. La colección crea sus registros de prueba.