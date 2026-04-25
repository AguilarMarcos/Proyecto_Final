

CREATE DATABASE IF NOT EXISTS escuela_db;
USE escuela_db;


CREATE TABLE IF NOT EXISTS usuarios (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(100) NOT NULL,
  email     VARCHAR(100) NOT NULL UNIQUE,
  password  VARCHAR(255) NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS alumnos (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(100) NOT NULL,
  matricula VARCHAR(20)  NOT NULL UNIQUE,
  grupo     VARCHAR(10)  NOT NULL,
  grado     VARCHAR(20)  NOT NULL,
  password  VARCHAR(255) DEFAULT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS calificaciones (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  alumno_id    INT NOT NULL,
  materia      VARCHAR(100) NOT NULL,
  calificacion DECIMAL(5,2) NOT NULL,
  periodo      VARCHAR(20)  NOT NULL,
  FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE
);


-- Admin: admin@escuela.com / Admin123
INSERT INTO usuarios (nombre, email, password) VALUES
('Administrador', 'admin@escuela.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- Alumnos con contraseña: Alumno123 para todos o password
INSERT INTO alumnos (nombre, matricula, grupo, grado, password) VALUES
('Ana García López',    'A001', '3A', 'Tercero', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
('Carlos Pérez Ruiz',   'A002', '3A', 'Tercero', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
('María Torres Soto',   'A003', '2B', 'Segundo', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
('Luis Hernández Vega', 'A004', '1C', 'Primero', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

INSERT INTO calificaciones (alumno_id, materia, calificacion, periodo) VALUES
(1,'Matemáticas',9.5,'2024-1'),(1,'Español',8.0,'2024-1'),(1,'Historia',9.0,'2024-1'),
(2,'Matemáticas',7.5,'2024-1'),(2,'Español',8.5,'2024-1'),
(3,'Matemáticas',10.0,'2024-1'),(3,'Historia',9.5,'2024-1'),
(4,'Español',6.5,'2024-1');
