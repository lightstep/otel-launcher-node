'use strict';

const PORT = process.env.PORT || 8080;

const express = require('express');
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send('running...');
});

app.get('/ping', (req, res) => {
  res.send('pong');
});

app.listen(PORT);
console.log(`Running on ${PORT}`);
