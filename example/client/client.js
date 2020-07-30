'use strict';

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:8080/ping';
const http = require('http');

setInterval(() => {
  console.log('send: ping');

  http.get(TARGET_URL, resp => {
    let data = '';
    resp.on('data', chunk => (data += chunk));
    resp.on('end', () => console.log(`recv: ${data}`));
    resp.on('error', err => console.log('Error: ' + err.message));
  });
}, 500);
