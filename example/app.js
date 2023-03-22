'use strict';
const opentelemetry = require('@opentelemetry/api');
const appName = 'launcher-node-example';
const tracer = opentelemetry.trace.getTracer(appName);
const meter = opentelemetry.metrics.getMeter(appName);
const counter = meter.createCounter('test-counter');
let count = 0;

setInterval(() => {
  count++;
  const span = tracer.startSpan('test-span');
  span.setAttribute('count', count);
  span.end();
  counter.add(1);
}, 10000);
