const { lightstep, opentelemetry } = require('../build/src/index');

// set access token or use LS_ACCESS_TOKEN environment variable
const token = 'YOUR ACCESS TOKEN';

const sdk = lightstep.configureOpenTelemetry({
  token,
  serviceName: 'locl-ex',
});

sdk.start().then(() => {
  const tracer = opentelemetry.trace.getTracer('locl-node-example');
  const span = tracer.startSpan('test-span');
  span.end();

  opentelemetry.trace.getTracerProvider().getActiveSpanProcessor().shutdown();
});
