# Launcher, an OpenTelemetry Configuration Layer 🚀

_NOTE: This is in beta and is expected to GA in Fall 2020._

### What is Launcher?

Launcher is a configuration layer that chooses default values for configuration options that many OpenTelemetry users want. It provides a single function in each language to simplify discovery of the options and components available to users. The goal of Launcher is to help users that aren't familiar with OpenTelemetry quickly ramp up on what they need to get going and instrument.

### Getting started

```bash
npm i lightstep-opentelemetry-launcher-node
```

### Configure

Minimal setup

```javascript
const {
  lightstep,
  opentelemetry,
} = require('lightstep-opentelemetry-launcher-node');

const sdk = lightstep.configureOpenTelemetry({
  accessToken: 'YOUR ACCESS TOKEN',
  serviceName: 'locl-ex',
});

sdk.start().then(() => {
  const tracer = opentelemetry.trace.getTracer('otel-node-example');
  const span = tracer.startSpan('test-span');
  span.end();

  opentelemetry.trace.getTracerProvider().getActiveSpanProcessor().shutdown();
});
```

### Configuration Options

| Config Option  | Env Variable                       | Required | Default                                            |
| -------------- | ---------------------------------- | -------- | -------------------------------------------------- |
| serviceName    | LS_SERVICE_NAME                    | y        | -                                                  |
| serviceVersion | LS_SERVICE_VERSION                 | n        | unknown                                            |
| spanEndpoint   | OTEL_EXPORTER_OTLP_SPAN_ENDPOINT   | n        | https://ingest.lightstep.com:443/api/v2/otel/trace |
| metricEndpoint | OTEL_EXPORTER_OTLP_METRIC_ENDPOINT | n        | https://ingest.lightstep.com:443/metrics           |
| accessToken    | LS_ACCESS_TOKEN                    | n        | -                                                  |
| logLevel       | OTEL_LOG_LEVEL                     | n        | info                                               |
| propagators    | OTEL_PROPAGATORS                   | n        | b3                                                 |
| resource       | OTEL_RESOURCE_ATTRIBUTES           | n        | -                                                  |

#### Additional Options

In addition the options below, the `configureOpenTelemetry` function will take any configuration
options supported by the OpenTelemetry Node SDK package and its return value is a NodeSDK instance.
See the [OpenTelemetry Node SDK documentation](https://github.com/open-telemetry/opentelemetry-js/tree/master/packages/opentelemetry-sdk-node) for more details.

### Principles behind Launcher

##### 100% interoperability with OpenTelemetry

One of the key principles behind putting together Launcher is to make lives of OpenTelemetry users easier, this means that there is no special configuration that **requires** users to install Launcher in order to use OpenTelemetry. It also means that any users of Launcher can leverage the flexibility of configuring OpenTelemetry as they need.

##### Opinionated configuration

Although we understand that not all languages use the same format for configuration, we find this annoying. We decided that Launcher would allow users to use the same configuration file across all languages. In this case, we settled for `YAML` as the format, which was inspired by the OpenTelemetry Collector.

##### Validation

Another decision we made with launcher is to provide end users with a layer of validation of their configuration. This provides us the ability to give feedback to our users faster, so they can start collecting telemetry sooner.

Start using it today in [Go](https://github.com/lightstep/otel-launcher-go), [Java](https://github.com/lightstep/otel-launcher-java), [Javascript](https://github.com/lightstep/otel-launcher-node) and [Python](https://github.com/lightstep/otel-launcher-python) and let us know what you think!

---

_Made with_ ![:heart:](https://a.slack-edge.com/production-standard-emoji-assets/10.2/apple-medium/2764-fe0f.png) _@ [Lightstep](http://lightstep.com/)_
