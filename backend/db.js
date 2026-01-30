const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const dbPath = path.join(__dirname, 'peluqueria.sqlite');

const shouldForce = process.env.FORCE_RECREATE_DB === 'true' || process.argv.includes('--recreate');

function initDb(db) {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      start TEXT,
      end TEXT,
      fecha DATE NOT NULL,
      horaInicio TEXT,
      horaFin TEXT,
      employeeId TEXT,
      category TEXT,
      clientPhone TEXT,
      formula TEXT,
      price REAL,
      paymentType TEXT,
      color TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // ÍNDICES
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_appointments_employee ON appointments(employeeId)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(fecha)`);

    const hashedPassword = bcrypt.hashSync('1234', 10);
    const users = [
      ['admin', hashedPassword, 'admin'],
      ['empleada1', hashedPassword, 'employee'],
      ['empleada2', hashedPassword, 'employee']
    ];
    
    users.forEach(([username, password, role]) => {
      db.run('INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)', 
             [username, password, role]);
    });

    console.log('✅ Base de datos inicializada');
  });
}

if (require.main === module) {
  // Ejecutado directamente: preguntar antes de eliminar a menos que se fuerce
  if (fs.existsSync(dbPath) && !shouldForce) {
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Se ha encontrado una base de datos existente. ¿Deseas eliminarla y crear una nueva? (s/N): ', answer => {
      rl.close();
      if (answer && ['s', 'S', 'y', 'Y'].includes(answer.trim())) {
        fs.unlinkSync(dbPath);
        console.log('✅ Base de datos anterior eliminada');
      } else if (!shouldForce) {
        console.log('Se conservará la base de datos existente.');
      }
      const db = new sqlite3.Database(dbPath);
      initDb(db);
      // Mantener abierto para inspección manual si se desea
    });
  } else {
    if (fs.existsSync(dbPath) && shouldForce) {
      fs.unlinkSync(dbPath);
      console.log('✅ Base de datos anterior eliminada (forzada)');
    }
    const db = new sqlite3.Database(dbPath);
    initDb(db);
  }
} else {
  // Importado como módulo por la app: no preguntar, no borrar a menos que se fuerce
  if (fs.existsSync(dbPath) && shouldForce) {
    fs.unlinkSync(dbPath);
    console.log('✅ Base de datos anterior eliminada (forzada via env/arg)');
  }
  const db = new sqlite3.Database(dbPath);
  initDb(db);
  module.exports = db;
}
