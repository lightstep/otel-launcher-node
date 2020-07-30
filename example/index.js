const { lightstep, opentelemetry } = require('../build/src/index');

// set access token or use LS_ACCESS_TOKEN environment variable
const accessToken = 'YOUR ACCESS TOKEN';

const sdk = lightstep.configureOpenTelemetry({
  //accessToken,
  serviceName: 'locl-ex',
});

sdk.start().then(() => {
  const tracer = opentelemetry.trace.getTracer('locl-node-example');
  const span = tracer.startSpan('test-span');
  span.end();

  opentelemetry.trace.getTracerProvider().getActiveSpanProcessor().shutdown();
});
