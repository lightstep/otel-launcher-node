'use strict';
const { DiagLogLevel } = require('@opentelemetry/api');
const { lightstep, opentelemetry } = require('../build/src/index');

// set access token or use LS_ACCESS_TOKEN environment variable
const accessToken = 'YOUR ACCESS TOKEN';

const sdk = lightstep.configureOpenTelemetry({
  accessToken,
  serviceName: 'launcher-node-ex',
  metricsEnabled: true,           // default is false
  metricsReportingPeriod: 10000,  // default is 30000
  logLevel: DiagLogLevel.ALL,
});

const appName = 'launcher-node-example';

sdk.start().then(() => {
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
}, console.log);
