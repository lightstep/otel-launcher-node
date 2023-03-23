# Launcher, a Lightstep Distro for OpenTelemetry 🚀

### What is Launcher?

Launcher is a configuration layer that chooses default values for configuration options that many OpenTelemetry users want. It provides a single function in each language to simplify discovery of the options and components available to users. The goal of Launcher is to help users that aren't familiar with OpenTelemetry quickly ramp up on what they need to get going and instrument.

### Getting started

```bash
npm i lightstep-opentelemetry-launcher-node
```

### Configure

#### Setup Tracing

Put the following in `tracing.js`

```javascript
const { lightstep } = require('lightstep-opentelemetry-launcher-node');

const sdk = lightstep.configureOpenTelemetry({
  accessToken: 'YOUR ACCESS TOKEN',
  serviceName: 'otel-example',
});

// initialize and start the SDK
sdk.start();

// Gracefully shutdown the SDK
const process = require('process');
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(
      () => console.log('SDK shut down successfully'),
      (err) => console.log('Error shutting down SDK', err)
    )
    .finally(() => process.exit(0));
});
```

#### Run Your Application

```javascript
node -r ./tracing.js app.js
```

### Customization

While the built-in automatic instrumentation will provide good coverage for many
users, there are scenarios where users may want to write custom instrumentation,
or enrich the existing telemetry. Below are links to some resources about the
OpenTelemetry API and some examples of its usage:

- [OpenTelemetry JS Tracing API][otel-js-tracing-api]
- [OpenTelemetry JS Examples][otel-js-examples]

### Configuration Options

| Config Option          | Env Variable                        | Required | Default                                        |
| ---------------------- | ----------------------------------- | -------- | ---------------------------------------------- |
| serviceName            | LS_SERVICE_NAME                     | y        | -                                              |
| serviceVersion         | LS_SERVICE_VERSION                  | n        | unknown                                        |
| spanEndpoint           | OTEL_EXPORTER_OTLP_TRACES_ENDPOINT  | n        | https://ingest.lightstep.com/traces/otlp/v0.9  |
| metricsEndpoint        | OTEL_EXPORTER_OTLP_METRICS_ENDPOINT | n        | https://ingest.lightstep.com/metrics/otlp/v0.9 |
| metricsReportingPeriod | OTEL_EXPORTER_OTLP_METRICS_PERIOD   | n        | 30000                                          |
| metricsEnabled         | LS_METRICS_ENABLED                  | n        | false                                          |
| accessToken            | LS_ACCESS_TOKEN                     | n        | -                                              |
| logLevel               | OTEL_LOG_LEVEL                      | n        | info                                           |
| propagators            | OTEL_PROPAGATORS                    | n        | b3                                             |
| resource               | OTEL_RESOURCE_ATTRIBUTES            | n        | -                                              |

#### Additional Options

In addition the options below, the `configureOpenTelemetry` function will take any configuration
options supported by the OpenTelemetry Node SDK package and its return value is a NodeSDK instance.
See the [OpenTelemetry Node SDK documentation](https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-sdk-trace-node) for more details.

### Upgrade Guidelines

#### 1.3.0 to 2.0.0
* NodeSDK.start() is now synchronous and no longer returns a promise. At a minimum, calls to `sdk.start().then(...);` should be changed to `sdk.start();`. It is now recommended to use a `tracing.js` with `node -r`. See [the example](#setup-tracing) for details.

### Principles behind Launcher

##### 100% interoperability with OpenTelemetry

One of the key principles behind putting together Launcher is to make lives of OpenTelemetry users easier, this means that there is no special configuration that **requires** users to install Launcher in order to use OpenTelemetry. It also means that any users of Launcher can leverage the flexibility of configuring OpenTelemetry as they need.

##### Validation

Another decision we made with launcher is to provide end users with a layer of validation of their configuration. This provides us the ability to give feedback to our users faster, so they can start collecting telemetry sooner.

Start using it today in [Go](https://github.com/lightstep/otel-launcher-go), [Java](https://github.com/lightstep/otel-launcher-java), [Javascript](https://github.com/lightstep/otel-launcher-node) and [Python](https://github.com/lightstep/otel-launcher-python) and let us know what you think!

---

_Made with_ ![:heart:](https://a.slack-edge.com/production-standard-emoji-assets/10.2/apple-medium/2764-fe0f.png) _@ [Lightstep](http://lightstep.com/)_

[otel-js-tracing-api]: https://github.com/open-telemetry/opentelemetry-js-api/blob/main/docs/tracing.md
[otel-js-examples]: https://github.com/open-telemetry/opentelemetry-js/tree/main/examples
