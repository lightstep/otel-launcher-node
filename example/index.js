const { lightstep, opentelemetry } = require('../build/src/index');
const { LogLevel } = require('@opentelemetry/core');

// set access token or use LS_ACCESS_TOKEN environment variable
const token = 'YOUR ACCESS TOKEN';

const sdk = lightstep.configureOpenTelemetry({
  token,
  logLevel: LogLevel.DEBUG,
  serviceName: 'locl-ex',
});

sdk.start();

const tracer = opentelemetry.trace.getTracer('locl-node-example');
const span = tracer.startSpan('test-span');
span.end();

opentelemetry.trace.getTracerProvider().getActiveSpanProcessor().shutdown();
