const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',         
  database: 'escuela_db'
});

db.connect(err => {
  if (err) {
    console.error('Error de conexión a MySQL:', err.message);
    return;
  }
  console.log('Conectado a MySQL correctamente');
});

module.exports = db;
