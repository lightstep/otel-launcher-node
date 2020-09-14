# CHANGELOG

All notable changes to this project will be documented in this file.

## Unreleased

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