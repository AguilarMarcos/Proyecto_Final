const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ 
  secret: 'escuela_secret_2024', 
  resave: false, 
  saveUninitialized: false, 
  cookie: { maxAge: 3600000, httpOnly: true } 
}));

function requireAuth(req, res, next) {
  if (!req.session.usuario) return res.status(401).json({ error: 'No estas autorizado. Inicia sesión primero.' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.usuario || req.session.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Este campo es solo para administradores.' });
  }
  next();
}

function requireAlumno(req, res, next) {
  if (!req.session.usuario || req.session.usuario.rol !== 'alumno') {
    return res.status(403).json({ error: 'Acceso denegado. Este campo es solo para alumnos.' });
  }
  next();
}


app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.get('/dashboard', (req, res) => {
  if (!req.session.usuario || req.session.usuario.rol !== 'admin') return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'pages', 'dashboard.html'));
});

app.get('/alumnos-page', (req, res) => {
  if (!req.session.usuario || req.session.usuario.rol !== 'admin') return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'pages', 'alumnos.html'));
});

app.get('/calificaciones-page', (req, res) => {
  if (!req.session.usuario || req.session.usuario.rol !== 'admin') return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'pages', 'calificaciones.html'));
});

app.get('/portal-alumno', (req, res) => {
  if (!req.session.usuario || req.session.usuario.rol !== 'alumno') return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'pages', 'portal-alumno.html'));
});


app.post('/api/registro', async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    

    if (!nombre || nombre.trim().length < 2) {
      return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Ingresa un correo electrónico válido y vuelve a intentarlo' });
    }
    if (!password || !/^(?=.*[a-zA-Z])(?=.*\d).{6,}$/.test(password)) {
      return res.status(400).json({ error: 'La contraseña debe tener mínimo 6 caracteres con al menos una letra y un número' });
    }
    
    const hashed = await bcrypt.hash(password, 10);
    
    db.query(
      'INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)', 
      [nombre.trim(), email.toLowerCase().trim(), hashed], 
      (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'El correo electrónico ya está registrado. Usa otro correo o inicia sesión' });
          }
          console.error('Error al registrar admin:', err);
          return res.status(500).json({ error: 'Error al registrar el administrador' });
        }
        res.status(201).json({ 
          mensaje: 'Administrador registrado correctamente', 
          id: result.insertId 
        });
      }
    );
  } catch (e) {
    console.error('Error en registro admin:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


app.post('/api/registro-alumno', async (req, res) => {
  try {
    const { nombre, matricula, grupo, grado, password } = req.body;


    if (!nombre || nombre.trim().length < 2) {
      return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres' });
    }
    if (!matricula || matricula.trim().length < 3) {
      return res.status(400).json({ error: 'La matrícula debe tener al menos 3 caracteres' });
    }
    if (!grupo || !/^[0-9]+[A-Z]$/i.test(grupo)) {
      return res.status(400).json({ error: 'El grupo debe tener formato válido (Ej. 3A, 2B, 1C)' });
    }
    if (!grado || !['Primero', 'Segundo', 'Tercero'].includes(grado)) {
      return res.status(400).json({ error: 'Selecciona un grado válido (Primero, Segundo o Tercero)' });
    }
    if (!password || !/^(?=.*[a-zA-Z])(?=.*\d).{6,}$/.test(password)) {
      return res.status(400).json({ error: 'La contraseña debe tener mínimo 6 caracteres con al menos una letra y un número' });
    }
    
    const matriculaUpper = matricula.trim().toUpperCase();
    const hashed = await bcrypt.hash(password, 10);
    
    db.query(
      'INSERT INTO alumnos (nombre, matricula, grupo, grado, password) VALUES (?, ?, ?, ?, ?)', 
      [nombre.trim(), matriculaUpper, grupo.trim().toUpperCase(), grado, hashed], 
      (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: `La matrícula "${matriculaUpper}" ya está registrada en el sistema` });
          }
          console.error('Error al registrar alumno:', err);
          return res.status(500).json({ error: 'Error al registrar el alumno' });
        }
        res.status(201).json({ 
          mensaje: 'Alumno registrado correctamente', 
          id: result.insertId,
          matricula: matriculaUpper
        });
      }
    );
  } catch (e) {
    console.error('Error en registro alumno:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }
  
  db.query('SELECT * FROM usuarios WHERE email = ?', [email.toLowerCase().trim()], async (err, results) => {
    if (err) {
      console.error('Error en login admin:', err);
      return res.status(500).json({ error: 'Error al iniciar sesión' });
    }
    
    if (!results.length) {
      return res.status(401).json({ error: 'Usuario no encontrado. Verifica tu correo o regístrate.' });
    }
    
    const match = await bcrypt.compare(password, results[0].password);
    if (!match) {
      return res.status(401).json({ error: 'Contraseña incorrecta. Intenta de nuevo.' });
    }
    
    req.session.usuario = { 
      id: results[0].id, 
      nombre: results[0].nombre, 
      email: results[0].email, 
      rol: 'admin' 
    };
    
    res.json({ 
      mensaje: 'Login correcto', 
      usuario: req.session.usuario 
    });
  });
});


app.post('/api/login-alumno', (req, res) => {
  const { matricula, password } = req.body;
  
  if (!matricula || !password) {
    return res.status(400).json({ error: 'Matrícula y contraseña son requeridas' });
  }
  
  db.query('SELECT * FROM alumnos WHERE matricula = ?', [matricula.trim().toUpperCase()], async (err, results) => {
    if (err) {
      console.error('Error en login alumno:', err);
      return res.status(500).json({ error: 'Error al iniciar sesión' });
    }
    
    if (!results.length) {
      return res.status(401).json({ error: `La matrícula "${matricula.toUpperCase()}" no está registrada` });
    }
    
    const alumno = results[0];
    
    if (!alumno.password) {
      return res.status(401).json({ error: 'Este alumno no tiene contraseña asignada. Contacta al administrador.' });
    }
    
    const match = await bcrypt.compare(password, alumno.password);
    if (!match) {
      return res.status(401).json({ error: 'Contraseña incorrecta. Intenta de nuevo.' });
    }
    
    req.session.usuario = { 
      id: alumno.id, 
      nombre: alumno.nombre, 
      matricula: alumno.matricula, 
      rol: 'alumno' 
    };
    
    res.json({ 
      mensaje: 'Login correcto', 
      usuario: req.session.usuario 
    });
  });
});

app.get('/api/logout', (req, res) => { 
  req.session.destroy(); 
  res.json({ mensaje: 'Sesión cerrada correctamente' }); 
});

app.get('/api/sesion', (req, res) => {
  if (req.session.usuario) {
    res.json({ autenticado: true, usuario: req.session.usuario });
  } else {
    res.json({ autenticado: false });
  }
});


app.get('/api/alumno/perfil', requireAlumno, (req, res) => {
  db.query('SELECT id, nombre, matricula, grupo, grado FROM alumnos WHERE id = ?', 
    [req.session.usuario.id], (err, r) => {
      if (err) return res.status(500).json({ error: 'Error al cargar perfil' });
      if (!r.length) return res.status(404).json({ error: 'Alumno no encontrado' });
      res.json(r[0]);
    });
});

app.put('/api/alumno/perfil', requireAlumno, async (req, res) => {
  const { nombre, password } = req.body;
  const id = req.session.usuario.id;
  
  if (!nombre || nombre.trim().length < 2) {
    return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres' });
  }
  
  try {
    if (password && password.trim().length > 0) {
      if (!/^(?=.*[a-zA-Z])(?=.*\d).{6,}$/.test(password)) {
        return res.status(400).json({ error: 'La contraseña debe tener mínimo 6 caracteres con letras y números' });
      }
      const hashed = await bcrypt.hash(password, 10);
      db.query('UPDATE alumnos SET nombre=?, password=? WHERE id=?', 
        [nombre.trim(), hashed, id], (err) => {
          if (err) return res.status(500).json({ error: 'Error al actualizar' });
          req.session.usuario.nombre = nombre.trim();
          res.json({ mensaje: 'Datos actualizados correctamente' });
        });
    } else {
      db.query('UPDATE alumnos SET nombre=? WHERE id=?', 
        [nombre.trim(), id], (err) => {
          if (err) return res.status(500).json({ error: 'Error al actualizar' });
          req.session.usuario.nombre = nombre.trim();
          res.json({ mensaje: 'Nombre actualizado correctamente' });
        });
    }
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/api/alumno/calificaciones', requireAlumno, (req, res) => {
  db.query('SELECT materia, calificacion, periodo FROM calificaciones WHERE alumno_id = ? ORDER BY periodo, materia',
    [req.session.usuario.id], (err, r) => {
      if (err) return res.status(500).json({ error: 'Error al cargar calificaciones' });
      res.json(r);
    });
});


app.get('/api/alumnos', requireAdmin, (req, res) => {
  db.query('SELECT * FROM alumnos ORDER BY nombre ASC', (err, r) => {
    if (err) return res.status(500).json({ error: 'Error al cargar alumnos' });
    res.json(r);
  });
});

app.get('/api/alumnos/:id', requireAdmin, (req, res) => {
  db.query('SELECT * FROM alumnos WHERE id=?', [req.params.id], (err, r) => {
    if (err) return res.status(500).json({ error: 'Error al buscar alumno' });
    if (!r.length) return res.status(404).json({ error: 'Alumno no encontrado' });
    res.json(r[0]);
  });
});

app.post('/api/alumnos', requireAdmin, async (req, res) => {
  const { nombre, matricula, grupo, grado, password } = req.body;
  
  if (!nombre || nombre.trim().length < 2) {
    return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres' });
  }
  if (!matricula || matricula.trim().length < 3) {
    return res.status(400).json({ error: 'La matrícula debe tener al menos 3 caracteres' });
  }
  if (!grupo || !/^[0-9]+[A-Z]$/i.test(grupo)) {
    return res.status(400).json({ error: 'Formato de grupo inválido' });
  }
  if (!grado || !['Primero', 'Segundo', 'Tercero'].includes(grado)) {
    return res.status(400).json({ error: 'Grado inválido' });
  }
  
  try {
    const hashed = password && password.trim().length > 0 ? await bcrypt.hash(password, 10) : null;
    const matriculaUpper = matricula.trim().toUpperCase();
    
    db.query('INSERT INTO alumnos (nombre, matricula, grupo, grado, password) VALUES (?,?,?,?,?)',
      [nombre.trim(), matriculaUpper, grupo.trim().toUpperCase(), grado, hashed], 
      (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: `La matrícula "${matriculaUpper}" ya existe` });
          }
          return res.status(500).json({ error: 'Error al crear alumno' });
        }
        res.status(201).json({ mensaje: 'Alumno creado correctamente', id: result.insertId });
      });
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.put('/api/alumnos/:id', requireAdmin, async (req, res) => {
  const { nombre, matricula, grupo, grado, password } = req.body;
  const id = req.params.id;
  
  if (!nombre || nombre.trim().length < 2) {
    return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres' });
  }
  if (!matricula || matricula.trim().length < 3) {
    return res.status(400).json({ error: 'La matrícula debe tener al menos 3 caracteres' });
  }
  
  try {
    const matriculaUpper = matricula.trim().toUpperCase();
    
    if (password && password.trim().length > 0) {
      if (!/^(?=.*[a-zA-Z])(?=.*\d).{6,}$/.test(password)) {
        return res.status(400).json({ error: 'Contraseña inválida' });
      }
      const hashed = await bcrypt.hash(password, 10);
      db.query('UPDATE alumnos SET nombre=?,matricula=?,grupo=?,grado=?,password=? WHERE id=?',
        [nombre.trim(), matriculaUpper, grupo.trim().toUpperCase(), grado, hashed, id], (err) => {
          if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
              return res.status(400).json({ error: `La matrícula "${matriculaUpper}" ya existe` });
            }
            return res.status(500).json({ error: 'Error al actualizar' });
          }
          res.json({ mensaje: 'Alumno actualizado correctamente' });
        });
    } else {
      db.query('UPDATE alumnos SET nombre=?,matricula=?,grupo=?,grado=? WHERE id=?',
        [nombre.trim(), matriculaUpper, grupo.trim().toUpperCase(), grado, id], (err) => {
          if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
              return res.status(400).json({ error: `La matrícula "${matriculaUpper}" ya existe` });
            }
            return res.status(500).json({ error: 'Error al actualizar' });
          }
          res.json({ mensaje: 'Alumno actualizado correctamente' });
        });
    }
  } catch (e) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.delete('/api/alumnos/:id', requireAdmin, (req, res) => {
  db.query('DELETE FROM alumnos WHERE id=?', [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al eliminar alumno' });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Alumno no encontrado' });
    res.json({ mensaje: 'Alumno eliminado correctamente' });
  });
});


app.get('/api/calificaciones', requireAdmin, (req, res) => {
  const sql = `SELECT c.id, a.nombre AS alumno, a.matricula, c.materia, c.calificacion, c.periodo
               FROM calificaciones c JOIN alumnos a ON c.alumno_id=a.id ORDER BY a.nombre, c.materia`;
  db.query(sql, (err, r) => {
    if (err) return res.status(500).json({ error: 'Error al cargar calificaciones' });
    res.json(r);
  });
});

app.post('/api/calificaciones', requireAdmin, (req, res) => {
  const { alumno_id, materia, calificacion, periodo } = req.body;
  
  if (!alumno_id || !materia || calificacion === undefined || !periodo) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }
  
  const cal = parseFloat(calificacion);
  if (isNaN(cal) || cal < 0 || cal > 10) {
    return res.status(400).json({ error: 'La calificación debe ser un número entre 0 y 10' });
  }
  
  db.query('INSERT INTO calificaciones (alumno_id,materia,calificacion,periodo) VALUES (?,?,?,?)',
    [alumno_id, materia, cal, periodo], (err, r) => {
      if (err) return res.status(500).json({ error: 'Error al registrar calificación' });
      res.status(201).json({ mensaje: 'Calificación registrada correctamente', id: r.insertId });
    });
});

app.put('/api/calificaciones/:id', requireAdmin, (req, res) => {
  const { alumno_id, materia, calificacion, periodo } = req.body;
  
  const cal = parseFloat(calificacion);
  if (isNaN(cal) || cal < 0 || cal > 10) {
    return res.status(400).json({ error: 'La calificación debe ser un número entre 0 y 10' });
  }
  
  db.query('UPDATE calificaciones SET alumno_id=?,materia=?,calificacion=?,periodo=? WHERE id=?',
    [alumno_id, materia, cal, periodo, req.params.id], (err) => {
      if (err) return res.status(500).json({ error: 'Error al actualizar calificación' });
      res.json({ mensaje: 'Calificación actualizada correctamente' });
    });
});

app.delete('/api/calificaciones/:id', requireAdmin, (req, res) => {
  db.query('DELETE FROM calificaciones WHERE id=?', [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al eliminar calificación' });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Calificación no encontrada' });
    res.json({ mensaje: 'Calificación eliminada correctamente' });
  });
});

app.listen(PORT, () => {
  console.log(`\nServidor corriendo en http://localhost:${PORT}`);
  console.log(`Sistema Escolar listo para usar\n`);
});