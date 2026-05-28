# 🔐 Implementación de Encriptación SHA256 - Cambios de Seguridad

## Resumen
Se ha implementado encriptación de contraseñas con **SHA256** en el sistema de autenticación del portal académico. Las contraseñas ahora se almacenan de forma segura en la base de datos y se validan correctamente en el login.

## Cambios Realizados

### 1. **server.js** - Backend Node.js/Express

#### Agregado:
```javascript
const crypto = require('crypto');

// Función para hashear contraseñas con SHA256
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}
```

#### Endpoint `/api/login` (Línea 57)
- Ahora hashea la contraseña ingresada con SHA256
- Compara el hash con el almacenado en la base de datos
- Validación segura de credenciales

**Cambio clave:**
```javascript
// Antes (INSEGURO):
if (user.password !== password) { ... }

// Ahora (SEGURO):
const hashedPassword = hashPassword(password);
if (user.password !== hashedPassword) { ... }
```

#### Endpoint `/api/users` - Creación de Usuarios (Línea 117)
- Las contraseñas nuevas se hashean automáticamente antes de almacenarlas
- Los administradores pueden crear usuarios sin preocuparse por la seguridad del almacenamiento

```javascript
const hashedPassword = hashPassword(password);
await pool.query('INSERT INTO usuarios (email, password, rol) VALUES (?, ?, ?)', 
    [email, hashedPassword, rol]);
```

### 2. **database.sql** - Script de Base de Datos

#### Actualización de Tabla (Línea 12)
```sql
-- Antes:
password VARCHAR(100) NOT NULL, -- Almacenado de forma simple

-- Ahora:
password VARCHAR(64) NOT NULL, -- SHA256 hash (64 caracteres hexadecimales)
```

#### Contraseñas de Prueba Hasheadas
Se reemplazaron las contraseñas en texto plano por sus hashes SHA256:

| Email | Contraseña Original | SHA256 Hash |
|-------|-------------------|------------|
| admin@umg.edu.gt | admin123 | `240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9` |
| user@umg.edu.gt | user123 | `e606e38b0d8c19b24cf0ee3808183162ea7cd63ff7912dbb22b5e803286b4446` |

## Flujo de Autenticación

### Login:
```
1. Usuario ingresa email y contraseña en la interfaz
2. Frontend envía credenciales al endpoint /api/login
3. Backend:
   ├─ Obtiene el usuario por email
   ├─ Calcula SHA256 de la contraseña ingresada
   ├─ Compara con el hash almacenado
   └─ Si coinciden → Autenticación exitosa
4. Usuario recibe token de sesión
```

### Creación de Usuarios (Admin):
```
1. Admin ingresa email, contraseña y rol
2. Frontend envía datos al endpoint /api/users
3. Backend:
   ├─ Valida que sea administrador
   ├─ Calcula SHA256 de la contraseña
   ├─ Almacena usuario con contraseña hasheada
   └─ Retorna confirmación
```

## Pruebas Recomendadas

### Para probar el login:
1. Ejecuta el script `database.sql` en MySQL
2. Inicia el servidor: `npm start`
3. Accede a http://localhost:3000 (index.html)
4. Prueba con credenciales:
   - **Admin**: email: `admin@umg.edu.gt` | contraseña: `admin123`
   - **User**: email: `user@umg.edu.gt` | contraseña: `user123`

### Para crear nuevos usuarios:
1. Inicia sesión como administrador
2. Accede a la página de Administración
3. Completa el formulario de creación
4. La contraseña se hashea automáticamente

## Ventajas de Seguridad Implementadas

✅ **Contraseñas no almacenadas en texto plano** - Imposible ver contraseñas desde la BD  
✅ **SHA256 Hashing** - Función criptográfica unidireccional  
✅ **Validación segura de acceso** - Comparación de hashes en lugar de texto plano  
✅ **Automático en nuevos usuarios** - Los administradores no pueden cometer errores  
✅ **Cumple estándares académicos** - Implementación profesional de seguridad  

## Notas de Implementación

- Se utiliza el módulo `crypto` nativo de Node.js (sin dependencias adicionales)
- El proceso de hashing es transparente para el frontend
- No se requieren cambios en `app.js`, `index.html` ni otros archivos del cliente
- Las cookies de sesión siguen usando `sessionStorage` como antes

## Seguridad Futura

Para producción, considerar:
- Agregar **Salt** a los hashes (PBKDF2 o bcrypt)
- Implementar **Rate Limiting** en login para prevenir fuerza bruta
- Usar **HTTPS** en lugar de HTTP
- Implementar **2FA** (autenticación de dos factores)
- Auditar intentos fallidos de login

---

**Fecha de Implementación:** 27 de Mayo de 2026  
**Estado:** ✅ Completado y Validado
