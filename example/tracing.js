'use strict';
const { DiagLogLevel } = require('@opentelemetry/api');
const { lightstep } = require('../build/src/index');
const process = require('process');

// set LS_ACCESS_TOKEN environment variable, or uncomment below
const sdk = lightstep.configureOpenTelemetry({
  //accessToken: '<YOUR_TOKEN'>,
  serviceName: 'launcher-node-ex',
  metricsEnabled: true,           // default is false
  metricsReportingPeriod: 10000,  // default is 30000
  logLevel: DiagLogLevel.ALL,
});

sdk.start();

process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(
      () => console.log('SDK shut down successfully'),
      (err) => console.log('Error shutting down SDK', err)
    )
    .finally(() => process.exit(0));
});
