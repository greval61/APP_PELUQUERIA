const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
let helmet;
try {
  helmet = require('helmet');
} catch (e) {
  console.warn('Aviso: paquete "helmet" no encontrado. Continuando sin helmet.');
  helmet = null;
}
const bodyParser = require('body-parser');

const app = express();
// Seguridad HTTP básica (si está disponible)
if (helmet) app.use(helmet());
// CORS restrictivo por defecto (desarrollar desde localhost:3000); puede configurarse con env var
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(bodyParser.json());

const db = new sqlite3.Database('./peluqueria.sqlite', (err) => {
    if (err) console.error("Error BD:", err);
    else console.log("Conectado a peluqueria.sqlite");
});

// Protección simple por clave para informes (usar variable de entorno REPORT_KEY)
const REPORT_KEY = process.env.REPORT_KEY || 'admin123';

// Ruta de Informes con desglose por empleado
app.get('/api/reports', (req, res) => {
    const key = req.get('x-report-key') || req.query.key || '';
    if (!key || key !== REPORT_KEY) {
        return res.status(401).json({ error: 'Acceso denegado: clave incorrecta' });
    }
        // Permitir filtro por tipo de pago: ?payment=all|CONTADO|TARJETA
        const payment = (req.query.payment || 'CONTADO').toUpperCase();
        // Permitir filtro por empleado: ?employee=all|1|2
        const employee = (req.query.employee || 'all');

        let sql = `
                SELECT 
                        fecha,
                        employeeId,
                        SUM(CAST(price AS DECIMAL)) as totalDia,
                        strftime('%m', fecha) as mes,
                        strftime('%Y', fecha) as anio
                FROM appointments
        `;
        const conditions = [];
        const params = [];

        if (payment === 'ALL') {
            conditions.push("paymentType IN ('CONTADO','TARJETA')");
        } else if (payment === 'CONTADO' || payment === 'TARJETA') {
            conditions.push('paymentType = ?');
            params.push(payment);
        } else if (payment === 'NONE') {
            // No pagados: paymentType NULL o cadena vacía
            conditions.push("(paymentType IS NULL OR paymentType = '')");
        } else {
            return res.status(400).json({ error: 'Parámetro payment inválido' });
        }

        if (employee && employee.toLowerCase() !== 'all') {
            conditions.push('employeeId = ?');
            params.push(employee);
        }

        if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');

        sql += ' GROUP BY fecha, employeeId ORDER BY fecha DESC ';

        db.all(sql, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            return res.json(rows);
        });
});

app.get('/api/appointments', (req, res) => {
    db.all("SELECT * FROM appointments", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        // Mapear paymentType a isPaid/ptv para mantener compatibilidad con el frontend
        const mapped = rows.map(r => ({
            ...r,
            isPaid: r.paymentType === 'CONTADO',
            ptv: r.paymentType === 'TARJETA'
        }));
        res.json(mapped);
    });
});

app.post('/api/appointments', (req, res) => {
    const { title, start, end, fecha, horaInicio, horaFin, employeeId, category, clientPhone, formula, price, isPaid, ptv, color } = req.body;

    // Validaciones básicas
    if (!title || String(title).trim().length === 0) return res.status(400).json({ message: 'El nombre del cliente es obligatorio' });
    if (!fecha) return res.status(400).json({ message: 'La fecha es obligatoria' });
    const parseMin = (t) => {
        if (!t) return null;
        const [hh, mm] = String(t).split(':').map(Number);
        if (isNaN(hh) || isNaN(mm)) return null;
        return hh * 60 + mm;
    };
    const s = parseMin(horaInicio);
    const f = parseMin(horaFin);
    if (s === null || f === null) return res.status(400).json({ message: 'Horas inválidas' });
    if (f <= s) return res.status(400).json({ message: 'La hora de fin debe ser posterior a la hora de inicio' });

    // Determinar paymentType según campos recibidos (mantener compatibilidad con frontend)
    let paymentType = null;
    if (isPaid === true || isPaid === 1 || String(isPaid) === 'true' || String(isPaid) === '1') paymentType = 'CONTADO';
    else if (ptv === true || ptv === 1 || String(ptv) === 'true' || String(ptv) === '1') paymentType = 'TARJETA';

    const sql = `INSERT INTO appointments 
        (title, start, end, fecha, horaInicio, horaFin, employeeId, category, clientPhone, formula, price, paymentType, color) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [title, start, end, fecha, horaInicio, horaFin, employeeId, category, clientPhone, formula, price, paymentType, color], function(err) {
        if (err) res.status(400).json({ message: err.message });
        else res.json({ id: this.lastID });
    });
});

app.delete('/api/appointments/:id', (req, res) => {
    db.run("DELETE FROM appointments WHERE id = ?", req.params.id, (err) => {
        if (err) res.status(400).json({ message: err.message });
        else res.json({ deleted: true });
    });
});

app.listen(5000, () => console.log("Servidor Génesis con Filtros en puerto 5000"));