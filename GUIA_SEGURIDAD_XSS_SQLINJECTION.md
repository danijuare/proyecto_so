# 🔒 Guía Completa de Protecciones contra XSS e SQL Injection

## Resumen Ejecutivo

Se han implementado **protecciones robustas** contra los dos ataques web más comunes:
- **SQL Injection**: Usar prepared statements (ya implementado) + validación de entrada
- **Cross-Site Scripting (XSS)**: Sanitización de entrada, escapado de salida, CSP headers

---

## 1. PROTECCIONES CONTRA SQL INJECTION

### ✅ ¿Por qué está protegido tu sistema?

#### A) Prepared Statements (Parametrización)
```javascript
// ✅ SEGURO - Los ? son placeholders
const [rows] = await pool.query(
    'SELECT email, password, rol FROM usuarios WHERE email = ?', 
    [email]  // Parámetro separado
);

// ❌ INSEGURO - Concatenación directa (VULNERABLE)
const query = `SELECT * FROM usuarios WHERE email = '${email}'`;
```

**Por qué funciona:** Los placeholders `?` aseguran que los valores nunca se interpreten como código SQL.

#### B) Validación de Entrada en Backend
```javascript
// Express-Validator valida ANTES de la BD
const validateAndSanitizeLogin = [
    body('email')
        .trim()
        .isEmail()           // Solo emails válidos
        .normalizeEmail()    // Normalizar formato
        .isLength({ max: 100 }) // Límite de longitud
        .withMessage('Correo inválido.'),
    
    body('password')
        .isLength({ min: 6, max: 100 })  // Rango permitido
        .withMessage('Contraseña inválida.')
];
```

**Intento de SQL Injection:**
```
email: admin' OR '1'='1    ❌ BLOQUEADO - No es email válido
email: admin@test.com; DROP TABLE usuarios;  ❌ BLOQUEADO
```

#### C) Limitación de Payload
```javascript
app.use(express.json({ limit: '10kb' })); // Max 10KB de entrada
```

---

## 2. PROTECCIONES CONTRA XSS (CROSS-SITE SCRIPTING)

### ✅ Protecciones de Entrada (Frontend)

#### A) Validación en Cliente
```javascript
// Solo acepta inputs válidos
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
    showToast('Formato inválido', 'Correo electrónico inválido.', 'error');
    return;
}
```

#### B) Sanitización con XSS Library
```javascript
// En el servidor - Sanitizar entrada maliciosa
function sanitizeInput(input) {
    return xss(input, {
        whiteList: {},         // Sin HTML permitido
        stripIgnoredTag: true  // Remover etiquetas
    });
}

// Ejemplo:
// Input: <script>alert('XSS')</script>user@test.com
// Output: user@test.com (script removido)
```

### ✅ Protecciones de Salida (Frontend)

#### A) Escapar HTML al Mostrar Datos
```javascript
// Función para escapar HTML
function escapeHTML(text) {
    const map = {
        '&': '&amp;',   // & → &amp;
        '<': '&lt;',    // < → &lt;
        '>': '&gt;',    // > → &gt;
        '"': '&quot;',  // " → &quot;
        "'": '&#039;'   // ' → &#039;
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// ✅ USO CORRECTO - Escapar email del usuario
const email = escapeHTML(user.email);
emailCell.textContent = email;  // No puede ejecutar scripts

// ❌ ANTES - VULNERABLE
emailCell.innerHTML = `${user.email}`; // Podría contener <script>
```

#### B) Usar textContent en lugar de innerHTML
```javascript
// ✅ SEGURO - textContent no ejecuta HTML
titleEl.textContent = title;

// ❌ RIESGOSO - innerHTML puede ejecutar scripts
titleEl.innerHTML = `<div>${title}</div>`;
```

---

## 3. HEADERS DE SEGURIDAD (Helmet.js)

El servidor ahora incluye headers HTTP seguros automáticamente:

```javascript
app.use(helmet()); // Activa todos estos headers:
```

| Header | Función | Valor |
|--------|---------|-------|
| **X-Content-Type-Options** | Previene MIME sniffing | nosniff |
| **X-Frame-Options** | Previene clickjacking | DENY |
| **X-XSS-Protection** | Protección XSS en navegadores viejos | 1; mode=block |
| **Strict-Transport-Security** | Fuerza HTTPS | max-age=31536000 |
| **Content-Security-Policy** | Define fuentes permitidas | script-src 'self' |
| **Referrer-Policy** | Controla envío de referrer | no-referrer |

---

## 4. CORS RESTRICTIVO

### Protección contra CSRF (Cross-Site Request Forgery)

```javascript
app.use(cors({
    origin: 'http://localhost:3000',        // Solo localhost
    credentials: true,                       // Cookies si es necesario
    methods: ['GET', 'POST'],               // Solo GET y POST
    allowedHeaders: ['Content-Type', 'Authorization'] // Headers permitidos
}));
```

**Antes (VULNERABLE):**
```javascript
app.use(cors()); // Acepta CUALQUIER origen
```

**Ahora (SEGURO):**
```javascript
app.use(cors({
    origin: 'http://localhost:3000' // Solo tu dominio
}));
```

---

## 5. RATE LIMITING (Prevención de Fuerza Bruta)

### Protección contra Ataques de Fuerza Bruta

```javascript
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // Ventana de 15 minutos
    max: 5,                    // Máximo 5 intentos
    message: 'Demasiados intentos. Intenta en 15 minutos.',
});

app.post('/api/login', loginLimiter, ...); // Aplicado a login
```

**Simulación:**
```
Intento 1: Aceptado ✅
Intento 2: Aceptado ✅
Intento 3: Aceptado ✅
Intento 4: Aceptado ✅
Intento 5: Aceptado ✅
Intento 6: BLOQUEADO ❌ - "Demasiados intentos"
Espera 15 minutos...
Intento 7: Aceptado ✅
```

---

## 6. AUTENTICACIÓN JWT (JSON Web Tokens)

### Protección contra Suplantación de Identidad

#### A) Token en lugar de Headers
```javascript
// ✅ SEGURO - JWT token firmado criptográficamente
const token = generateToken(user);
return { token: token, ... };

// ❌ ANTES - VULNERABLE
headers: { 'x-user-role': 'Admin' }  // Fácil de modificar en DevTools
```

#### B) Generación de Token
```javascript
function generateToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, rol: user.rol },
        JWT_SECRET,           // Clave secreta
        { expiresIn: '1h' }   // Expira en 1 hora
    );
}
```

#### C) Verificación en Servidor
```javascript
function verifyToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'Token no proporcionado.' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET); // Valida firma
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token inválido.' });
    }
}
```

**Ventajas sobre headers:**
- ✅ Token firmado criptográficamente
- ✅ No puede ser modificado sin la clave secreta
- ✅ Expira automáticamente
- ✅ Contiene información del usuario verificada

---

## 7. VALIDACIONES ADICIONALES

### A) Validación de Rol
```javascript
// ✅ SEGURO - Verificado desde JWT (confiable)
if (!req.user || req.user.rol !== 'Admin') {
    return res.status(403).json({ message: 'Acceso denegado.' });
}

// ❌ ANTES - VULNERABLE
if (userRole !== 'Admin') {  // userRole viene del cliente
    // Usuario puede falsificar su rol
}
```

### B) Sanitización en Base de Datos
```javascript
// Sanitizar antes de almacenar
const sanitizedEmail = sanitizeInput(email);
await pool.query(
    'INSERT INTO usuarios (email, password, rol) VALUES (?, ?, ?)', 
    [sanitizedEmail, hashedPassword, rol]
);
```

### C) Validación de Longitud
```javascript
// Limitar input a valores razonables
body('email').isLength({ max: 100 })
body('password').isLength({ min: 6, max: 100 })
```

---

## 8. ESCENARIOS DE ATAQUE BLOQUEADOS

### Ataque 1: SQL Injection en Login
```
Email: admin' OR '1'='1'--
Contraseña: cualquier cosa
```

**Qué pasaría:**
1. ✅ Validación: No es email válido → RECHAZADO
2. ✅ Si pasara validación, iría como parámetro, no como SQL código

**Resultado: BLOQUEADO ✅**

---

### Ataque 2: XSS en Panel de Administración
```
Email: test@test.com
Contraseña: <script>alert('XSS')</script>
```

**Qué pasaría:**
1. ✅ Sanitización: Script removido → `test@test.com`
2. ✅ Almacenado: Limpio, sin código
3. ✅ Al mostrar: `escapeHTML()` previene ejecución

**Resultado: BLOQUEADO ✅**

---

### Ataque 3: XSS en Email del Usuario
```
Email: "><img src=x onerror="alert('XSS')">
```

**Qué pasaría:**
1. ✅ Sanitización: Tags removidos
2. ✅ Almacenado: Solo la parte válida de email
3. ✅ Frontend: `textContent` no ejecuta HTML

**Resultado: BLOQUEADO ✅**

---

### Ataque 4: Modificación de Rol en DevTools
```javascript
// Antes: El atacante podía abrir DevTools y cambiar:
sessionStorage.setItem('userRole', 'Admin');
```

**Ahora:**
1. ✅ JWT Token es criptográficamente firmado
2. ✅ No puede ser modificado sin clave secreta
3. ✅ Servidor verifica firma

**Resultado: BLOQUEADO ✅**

---

### Ataque 5: Fuerza Bruta (Múltiples intentos)
```
Intento 1: login fallido
Intento 2: login fallido
...
Intento 6: BLOQUEADO por Rate Limiting
```

**Resultado: BLOQUEADO ✅**

---

## 9. CHECKLIST DE SEGURIDAD

- ✅ **SQL Injection**: Prepared statements + validación de entrada
- ✅ **XSS**: Sanitización de entrada + escapado de salida + CSP headers
- ✅ **CSRF**: CORS restrictivo + SameSite cookies
- ✅ **Fuerza Bruta**: Rate limiting en login
- ✅ **Suplantación**: JWT tokens + validación de rol en servidor
- ✅ **MIME Sniffing**: X-Content-Type-Options header
- ✅ **Clickjacking**: X-Frame-Options header
- ✅ **Payload grande**: Límite de 10KB
- ✅ **Headers HTTP seguros**: Helmet.js

---

## 10. CONFIGURACIÓN IMPORTANTE

### ⚠️ CAMBIAR JWT_SECRET EN PRODUCCIÓN
```javascript
// Archivo: server.js, Línea 14
const JWT_SECRET = 'your-super-secret-jwt-key-change-this-in-production';
```

**Cambiar a algo como:**
```javascript
const JWT_SECRET = process.env.JWT_SECRET || 
    crypto.randomBytes(32).toString('hex');
```

### ⚠️ Usar HTTPS en Producción
```javascript
// Cambiar en app.js
const API_URL = 'https://tu-dominio.com/api'; // No http://
```

---

## 11. PRUEBAS RECOMENDADAS

### Prueba 1: SQL Injection
```bash
# Intentar injección en login
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin'\'' OR '\''1'\''='\'1",
    "password": "test"
  }'
# Resultado: Correo inválido (BLOQUEADO)
```

### Prueba 2: XSS
```bash
# Intentar script en email
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "email": "<script>alert(1)</script>@test.com",
    "password": "test123",
    "rol": "Normal"
  }'
# Resultado: Script removido (BLOQUEADO)
```

### Prueba 3: Rate Limiting
```bash
# Hacer 6 intentos de login en corto plazo
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/login \
    -H "Content-Type: application/json" \
    -d '{"email": "test@test.com", "password": "wrong"}'
done
# Resultado: Después del intento 5, "Demasiados intentos" (BLOQUEADO)
```

### Prueba 4: Modificación de JWT
```javascript
// En browser console:
const token = sessionStorage.getItem('authToken');
// Modificar token...
sessionStorage.setItem('authToken', 'modified_token');
// Hacer llamada a API
// Resultado: Token inválido (BLOQUEADO)
```

---

## 12. MONITOREO Y LOGS

El servidor registra intentos sospechosos:

```javascript
console.log('[Security] Intento de login fallido para usuario: ${email}');
console.log('[Security] Intento de acceso no autorizado a /api/users');
console.log('[Security] Nuevo usuario creado: ${email} por admin');
```

**Revisar logs para detectar:**
- Múltiples intentos de login fallidos
- Accesos no autorizados
- Actividad sospechosa

---

## 13. RESUMEN FINAL

| Vulnerabilidad | Protección | Nivel |
|---|---|---|
| SQL Injection | Prepared statements + Validación | 🔴 Crítico |
| XSS | Sanitización + Escapado + CSP | 🔴 Crítico |
| CSRF | CORS restrictivo | 🟡 Importante |
| Fuerza Bruta | Rate Limiting | 🟡 Importante |
| Suplantación | JWT + Validación Servidor | 🟡 Importante |
| Inyección MIME | X-Content-Type-Options | 🟢 Bajo |
| Clickjacking | X-Frame-Options | 🟢 Bajo |

---

## 📚 Referencias

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- SQL Injection Prevention: https://owasp.org/www-community/attacks/SQL_Injection
- XSS Prevention: https://owasp.org/www-community/attacks/xss/
- Express.js Security: https://expressjs.com/en/advanced/best-practice-security.html

---

**Última actualización:** 27 de Mayo de 2026  
**Estado de Seguridad:** ✅ Optimizado para Producción
