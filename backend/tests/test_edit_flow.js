const http = require('http');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, body: raw }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function run() {
  try {
    // 1) obtener citas
    const get = await request({ hostname: 'localhost', port: 5000, path: '/api/appointments', method: 'GET' });
    if (get.status !== 200) throw new Error('GET failed: ' + get.status);
    const rows = JSON.parse(get.body);
    const target = rows.find(r => r.title === 'PruebaFormula');
    if (!target) { console.log('No encontrada PruebaFormula'); return; }
    console.log('Encontrada id=', target.id, 'formula=', target.formula);

    // 2) eliminar
    const del = await request({ hostname: 'localhost', port: 5000, path: '/api/appointments/' + target.id, method: 'DELETE' });
    console.log('DELETE status', del.status, 'body', del.body);
    if (del.status !== 200) throw new Error('DELETE failed');

    // 3) crear con fórmula nueva
    const newData = JSON.stringify({
      title: 'PruebaFormula',
      start: '2026-01-30T09:00:00',
      end: '2026-01-30T09:30:00',
      fecha: '2026-01-30',
      horaInicio: '09:00',
      horaFin: '09:30',
      employeeId: '1',
      category: 'Corte',
      clientPhone: '600111222',
      formula: 'FORMULA_UPDATED',
      price: '35',
      isPaid: true
    });
    const post = await request({ hostname: 'localhost', port: 5000, path: '/api/appointments', method: 'POST', headers: { 'Content-Type':'application/json', 'Content-Length': Buffer.byteLength(newData) } }, newData);
    console.log('POST status', post.status, 'body', post.body);
    if (post.status !== 200) throw new Error('POST failed');

    // 4) verificar
    const get2 = await request({ hostname:'localhost', port:5000, path:'/api/appointments', method:'GET' });
    const rows2 = JSON.parse(get2.body);
    const found = rows2.filter(r => r.title === 'PruebaFormula');
    console.log('Encontradas ahora:', found.length);
    found.forEach(f => console.log('id=', f.id, 'formula=', f.formula, 'price=', f.price));
  } catch (err) {
    console.error('Error flow:', err.message || err);
    process.exit(1);
  }
}

run();
