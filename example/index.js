const { lightstep, opentelemetry } = require('../build/src/index');

// set access token or use LS_ACCESS_TOKEN environment variable
const accessToken = 'YOUR ACCESS TOKEN';

const sdk = lightstep.configureOpenTelemetry({
  accessToken,
  serviceName: 'locl-ex',
  metricInterval: 3000,
  // metricsHostEnabled: false,
});

sdk.start().then(() => {
  const tracer = opentelemetry.trace.getTracer('locl-node-example');
  let count = 0;
  setInterval(() => {
    count++;
    const span = tracer.startSpan('test-span');
    span.setAttribute('count', count);
    span.end();

    // force to export traces
    // tracer.getActiveSpanProcessor().forceFlush();
  }, 10000);
}, console.log);
