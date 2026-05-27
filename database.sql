-- =======================================================
-- SCRIPT DE CREACIÓN DE BASE DE DATOS Y TABLA DE USUARIOS
-- Ejecutar en HeidiSQL o consola MySQL/MariaDB
-- =======================================================

-- 1. Crear la Base de Datos si no existe
CREATE DATABASE IF NOT EXISTS portal_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE portal_db;

-- 2. Crear la Tabla de Usuarios con campo de Rol
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL, -- Almacenado de forma simple para fines académicos
    rol VARCHAR(20) NOT NULL DEFAULT 'Normal', -- 'Normal' o 'Admin'
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. Limpiar registros previos (opcional)
TRUNCATE TABLE usuarios;

-- 4. Insertar Usuarios de Prueba (Roles: Normal y Admin)
-- Cuenta Administrador (Puede ver y crear usuarios)
INSERT INTO usuarios (email, password, rol) 
VALUES ('admin@umg.edu.gt', 'admin123', 'Admin');

-- Cuenta Normal (Solo puede ver el contenido)
INSERT INTO usuarios (email, password, rol) 
VALUES ('user@umg.edu.gt', 'user123', 'Normal');

-- 5. Verificar registros
SELECT id, email, rol, fecha_creacion FROM usuarios;
