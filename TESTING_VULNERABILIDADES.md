# 🧪 Testing de Vulnerabilidades - Script de Prueba

## Instrucciones para Probar Vulnerabilidades

### Requisitos Previos
1. Servidor ejecutándose: `npm start`
2. Base de datos iniciada con `database.sql`
3. cURL instalado (viene con Windows 10+) o Postman

---

## 1. PRUEBA DE SQL INJECTION

### Prueba 1.1: Email con SQL Injection
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin' OR '1'='1\",\"password\":\"test\"}"
```

**Resultado esperado:**
```
✅ PROTEGIDO - Respuesta 400
{
  "success": false,
  "message": "Correo inválido."
}
```

### Prueba 1.2: SQL Injection con comentario
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin'--\",\"password\":\"test\"}"
```

**Resultado esperado:**
```
✅ PROTEGIDO - Respuesta 400
{
  "success": false,
  "message": "Correo inválido."
}
```

### Prueba 1.3: SQL UNION-based Injection
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin' UNION SELECT * FROM usuarios--\",\"password\":\"test\"}"
```

**Resultado esperado:**
```
✅ PROTEGIDO - Respuesta 400
{
  "success": false,
  "message": "Correo inválido."
}
```

---

## 2. PRUEBA DE XSS (CROSS-SITE SCRIPTING)

### Prueba 2.1: XSS básico en email
```bash
# Obtener token primero
TOKEN=$(curl -s -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@umg.edu.gt\",\"password\":\"admin123\"}" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Intentar XSS
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"email\":\"<script>alert('XSS')</script>@test.com\",\"password\":\"test123\",\"rol\":\"Normal\"}"
```

**Resultado esperado:**
```
✅ PROTEGIDO - Respuesta 400
{
  "success": false,
  "message": "Correo inválido."
}
```

### Prueba 2.2: XSS con evento HTML
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"email\":\"<img src=x onerror='alert(1)'>@test.com\",\"password\":\"test123\",\"rol\":\"Normal\"}"
```

**Resultado esperado:**
```
✅ PROTEGIDO - Respuesta 400
```

### Prueba 2.3: XSS con CDATA
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"email\":\"<![CDATA[<script>alert(1)</script>]]>@test.com\",\"password\":\"test123\",\"rol\":\"Normal\"}"
```

**Resultado esperado:**
```
✅ PROTEGIDO - Respuesta 400
```

---

## 3. PRUEBA DE RATE LIMITING

### Script para Probar Rate Limiting
```bash
#!/bin/bash

echo "Probando Rate Limiting en login..."
echo ""

for i in {1..7}; do
    echo "Intento $i:"
    curl -s -X POST http://localhost:3000/api/login \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"test@test.com\",\"password\":\"wrongpassword\"}" | python3 -m json.tool
    echo ""
    echo "---"
    sleep 1
done
```

**Resultado esperado:**
```
Intento 1: 401 Unauthorized (credenciales incorrectas)
Intento 2: 401 Unauthorized
Intento 3: 401 Unauthorized
Intento 4: 401 Unauthorized
Intento 5: 401 Unauthorized
Intento 6: 429 Too Many Requests
  "message": "Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos."
Intento 7: 429 Too Many Requests
```

---

## 4. PRUEBA DE VALIDACIÓN DE JWT

### Prueba 4.1: Token Inválido
```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer invalid_token_here"
```

**Resultado esperado:**
```
✅ PROTEGIDO - Respuesta 401
{
  "success": false,
  "message": "Token inválido o expirado."
}
```

### Prueba 4.2: Token Modificado
```bash
# Obtener token válido
TOKEN=$(curl -s -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@umg.edu.gt\",\"password\":\"admin123\"}" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Modificar parte del token (cambiar último carácter)
MODIFIED_TOKEN="${TOKEN%?}X"

# Intentar usar token modificado
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer $MODIFIED_TOKEN"
```

**Resultado esperado:**
```
✅ PROTEGIDO - Respuesta 401
{
  "success": false,
  "message": "Token inválido o expirado."
}
```

### Prueba 4.3: Sin Token
```bash
curl -X GET http://localhost:3000/api/users \
  -H "Content-Type: application/json"
```

**Resultado esperado:**
```
✅ PROTEGIDO - Respuesta 401
{
  "success": false,
  "message": "Token no proporcionado."
}
```

---

## 5. PRUEBA DE CORS RESTRICTIVO

### Prueba 5.1: Origen No Permitido (Simular)
```bash
# Simular request desde otro dominio
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://malicious-site.com" \
  -d "{\"email\":\"admin@umg.edu.gt\",\"password\":\"admin123\"}"
```

**Resultado esperado:**
```
✅ PROTEGIDO - CORS headers:
Access-Control-Allow-Origin: http://localhost:3000
(No se incluye malicious-site.com)
```

---

## 6. PRUEBA DE MÉTODOS HTTP NO PERMITIDOS

### Prueba 6.1: PUT no permitido
```bash
curl -X PUT http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@test.com\"}"
```

**Resultado esperado:**
```
✅ PROTEGIDO - Respuesta 404 o Method Not Allowed
```

### Prueba 6.2: DELETE no permitido
```bash
curl -X DELETE http://localhost:3000/api/users/1
```

**Resultado esperado:**
```
✅ PROTEGIDO - Respuesta 404 o Method Not Allowed
```

---

## 7. PRUEBA DE LÍMITE DE PAYLOAD

### Prueba 7.1: Payload muy grande
```bash
# Crear payload > 10KB
LARGE_EMAIL=$(python3 -c "print('a' * 20000 + '@test.com')")

curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$LARGE_EMAIL\",\"password\":\"test\"}"
```

**Resultado esperado:**
```
✅ PROTEGIDO - Respuesta 413 Payload Too Large
```

---

## 8. SCRIPT AUTOMATIZADO DE TESTING

Guarda este contenido en un archivo `test_security.sh`:

```bash
#!/bin/bash

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🔒 SECURITY TESTING SUITE"
echo "=========================="
echo ""

# Test 1: SQL Injection
echo -e "${GREEN}[TEST 1]${NC} SQL Injection Protection"
RESULT=$(curl -s -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin' OR '1'='1\",\"password\":\"test\"}" | grep -o "Correo inválido")

if [ "$RESULT" = "Correo inválido" ]; then
    echo -e "${GREEN}✅ PASSED${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi
echo ""

# Test 2: Rate Limiting (6 requests)
echo -e "${GREEN}[TEST 2]${NC} Rate Limiting Protection"
for i in {1..6}; do
    RESPONSE=$(curl -s -X POST http://localhost:3000/api/login \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"test@test.com\",\"password\":\"wrong\"}")
    
    if [ $i -eq 6 ]; then
        BLOCKED=$(echo "$RESPONSE" | grep -o "Demasiados intentos")
        if [ "$BLOCKED" = "Demasiados intentos" ]; then
            echo -e "${GREEN}✅ PASSED${NC}"
        else
            echo -e "${RED}❌ FAILED${NC}"
        fi
    fi
done
echo ""

# Test 3: Valid Login
echo -e "${GREEN}[TEST 3]${NC} Valid Login"
TOKEN=$(curl -s -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@umg.edu.gt\",\"password\":\"admin123\"}" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$TOKEN" ] && [ ${#TOKEN} -gt 10 ]; then
    echo -e "${GREEN}✅ PASSED${NC}"
    echo "Token obtenido: ${TOKEN:0:20}..."
else
    echo -e "${RED}❌ FAILED${NC}"
fi
echo ""

# Test 4: JWT Validation
echo -e "${GREEN}[TEST 4]${NC} JWT Token Validation"
INVALID=$(curl -s -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer invalid_token" | grep -o "Token inválido")

if [ "$INVALID" = "Token inválido" ]; then
    echo -e "${GREEN}✅ PASSED${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi
echo ""

echo "=========================="
echo "Testing complete!"
```

**Ejecutar:**
```bash
chmod +x test_security.sh
./test_security.sh
```

---

## 9. TESTING CON POSTMAN

### Importar Colección
Copia esta colección en Postman:

```json
{
  "info": {
    "name": "Security Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Login Valid",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/api/login",
        "body": {
          "email": "admin@umg.edu.gt",
          "password": "admin123"
        }
      }
    },
    {
      "name": "Login SQL Injection",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/api/login",
        "body": {
          "email": "admin' OR '1'='1",
          "password": "test"
        }
      }
    },
    {
      "name": "Get Users Valid Token",
      "request": {
        "method": "GET",
        "url": "http://localhost:3000/api/users",
        "header": {
          "Authorization": "Bearer {{TOKEN}}"
        }
      }
    },
    {
      "name": "Get Users Invalid Token",
      "request": {
        "method": "GET",
        "url": "http://localhost:3000/api/users",
        "header": {
          "Authorization": "Bearer invalid_token"
        }
      }
    }
  ]
}
```

---

## 10. CHECKLIST DE TESTING

- [ ] Test SQL Injection con 'OR'1'='1
- [ ] Test SQL Injection con comentarios --
- [ ] Test XSS con <script> tags
- [ ] Test XSS con evento onerror
- [ ] Test Rate Limiting (6 intentos)
- [ ] Test JWT Token válido
- [ ] Test JWT Token inválido
- [ ] Test Token modificado
- [ ] Test Sin token
- [ ] Test Payload muy grande
- [ ] Test Métodos HTTP no permitidos
- [ ] Test CORS desde otro origen
- [ ] Test Login válido con admin
- [ ] Test Login válido con user
- [ ] Test Crear usuario sin token
- [ ] Test Crear usuario con token user (debe fallar)
- [ ] Test Crear usuario con token admin (debe éxito)

---

## 📊 Reporte de Testing

Después de correr los tests, tu reporte debe mostrar:

```
✅ SQL Injection: BLOQUEADO (Correo inválido)
✅ XSS: BLOQUEADO (Correo inválido)
✅ Rate Limiting: BLOQUEADO (Después de 5 intentos)
✅ JWT Validation: BLOQUEADO (Token inválido)
✅ CORS: BLOQUEADO (Origen no permitido)
✅ Method Not Allowed: BLOQUEADO (Método no permitido)
✅ Payload Limit: BLOQUEADO (Payload > 10KB)
✅ Valid Login: PERMITIDO ✅
✅ Valid Access: PERMITIDO ✅

SCORE: 10/10 ✅
```

---

**Última actualización:** 27 de Mayo de 2026
