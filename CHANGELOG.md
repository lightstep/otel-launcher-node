# CHANGELOG

All notable changes to this project will be documented in this file.

## Unreleased

## 0.16.0

* Opentelemetry dependencies have been upgraded to API v1.0.0-rc.0, core v0.19.0
  and contrib v0.16.0.

## 0.15.0

* Opentelemetry dependencies have been upgraded to v0.18.0 for core components
  and v0.14.0 for contrib.
* Auto-collection of host metrics has been removed as metrics are currently
  experimental in OpenTelemetry. Early adopters can still use the OpenTelemetry
  metrics packages, but must configure them manually. See the [OpenTelemetry JS](https://github.com/open-telemetry/opentelemetry-js) 
  project docs for more information.

## 0.14.0

* Opentelemetry dependencies have been upgraded to v0.15.0 for core components
  and v0.13.0 for contrib.

## 0.13.1

* Sends spans to an updated OTLP ingest endpoint that properly handles span
  status for OTLP v0.6. Fixes issue [#33](https://github.com/lightstep/otel-launcher-node/issues/33).
* Fixes configuration related bug that results in host metrics being disabled
  by default.

## 0.13.0

* Dependencies have been upgraded to the latest OpenTelemetry JS versions
  (v0.14.0 for API and SDK components and v0.12.0 for plugins).
* Automatically collects and sends host metrics to Lightstep. This behavior can
  be controlled by setting the `LS_METRICS_HOST_ENABLED` environment variable,
  or the `metricsHostEnabled` in-code configuration.

## 0.12.0
* Dependencies have been upgraded to the latest OpenTelemetry JS versions 
  (v0.12.0 for API and SDK components and v0.11.0 for plugins).
* Auto-detects and adds the host.name resource attribute by default.

## 0.11.0

* Dependencies have been upgraded to the latest OpenTelemetry JS versions 
  (v0.11.0 for API and SDK components and v0.10.0 for plugins).
* The @opentelemetry/exporter-collector dependency only supports JSON over
  HTTP as an export option. This was always the default for Launcher, but
  configuring GRPC or Proto over HTTP was possible. It still is, but will 
  require adding an explicit dependency on @opentelemetry/exporter-collector-grpc 
  or @opentelemetry/exporter-collector-proto
* HttpTextProgator was renamed to TextMapPropagator in OpenTelemetry v0.11.0.
  Laucher defaults handle this change properly. Users overriding default
  propagation configuration should be aware of the upstream change.

## 0.10.3

* Read data from the OTEL_RESOURCE_ATTRIBUTES environment variable for resource
  autodetection ([#13](https://github.com/lightstep/otel-launcher-node/pull/13))
* Include `plugins-node-all` package by default ([#12](https://github.com/lightstep/otel-launcher-node/pull/12))

## 0.10.2

* Initial release