const http = require('http');

function postAppointment(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/appointments',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => raw += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: raw }));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function getAppointments() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:5000/api/appointments', (res) => {
      let raw = '';
      res.on('data', (c) => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, body: raw }));
    }).on('error', reject);
  });
}

(async () => {
  try {
    const data = {
      title: 'PruebaFormula',
      start: '2026-01-30T09:00:00',
      end: '2026-01-30T09:30:00',
      fecha: '2026-01-30',
      horaInicio: '09:00',
      horaFin: '09:30',
      employeeId: '1',
      category: 'Corte',
      clientPhone: '600111222',
      formula: 'FORMULA_TEST',
      price: '30',
      isPaid: true
    };

    console.log('Posting appointment...');
    const postRes = await postAppointment(data);
    console.log('POST status', postRes.status, 'body', postRes.body);

    console.log('\nFetching appointments...');
    const getRes = await getAppointments();
    console.log('GET status', getRes.status);
    const rows = JSON.parse(getRes.body);
    const found = rows.filter(r => r.title === 'PruebaFormula');
    console.log('Found count:', found.length);
    if (found.length) console.log('Sample formula:', found[0].formula);
  } catch (err) {
    console.error('Error during test:', err.message || err);
    process.exit(1);
  }
})();
