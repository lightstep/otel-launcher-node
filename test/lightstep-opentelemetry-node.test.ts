import * as assert from 'assert';
import { lightstep, LightstepConfigurationError, LightstepEnv } from '../src';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { trace, metrics, context, propagation } from '@opentelemetry/api';
import {
  B3Propagator,
  CompositePropagator,
  HttpTraceContext,
} from '@opentelemetry/core';
import { SERVICE_RESOURCE } from '@opentelemetry/resources';
import { NodeTracerProvider } from '@opentelemetry/node';

describe('Lightstep OpenTelemetry Node', () => {
  describe('configureSDK', () => {
    const token = 'x'.repeat(32);
    const serviceName = 'test-service';
    const minimalConfig = { token, serviceName };

    beforeEach(() => {
      Object.keys(process.env as LightstepEnv).forEach(
        k => delete process.env[k]
      );

      trace.disable();
      metrics.disable();
      context.disable();
      propagation.disable();
    });

    describe('minimal configuration', () => {
      it('should require access token and serviceName', () => {
        const sdk = lightstep.configureOpenTelemetry({
          token,
          serviceName,
        });
        assert.ok(sdk instanceof NodeSDK);
      });
    });

    describe('service name', () => {
      it('is required', () => {
        assert.throws(
          () => lightstep.configureOpenTelemetry({ token }),
          err => {
            assert(err instanceof LightstepConfigurationError);
            assert.match(
              err.message,
              /^Invalid configuration: service name missing/
            );
            return true;
          }
        );
      });

      it('should be settable by environment', () => {
        process.env.LS_SERVICE_NAME = 'test-service';
        const sdk = lightstep.configureOpenTelemetry({ token });
        assert.ok(sdk instanceof NodeSDK);
      });

      it('is added to the resource', () => {
        const sdk = lightstep.configureOpenTelemetry({ token, serviceName });
        assert.ok(sdk instanceof NodeSDK);
        sdk.start();
        assert.strictEqual(
          (trace.getTracerProvider() as NodeTracerProvider).resource.labels[
            SERVICE_RESOURCE.NAME
          ],
          serviceName
        );
      });
    });

    describe('access token', () => {
      it('is required for prod', () => {
        assert.throws(
          () => lightstep.configureOpenTelemetry({ serviceName }),
          err => {
            assert(err instanceof LightstepConfigurationError);
            assert.match(
              err.message,
              /^Invalid configuration: access token missing/
            );
            return true;
          }
        );
      });

      it('is not required for custom sat', () => {
        const sdk = lightstep.configureOpenTelemetry({
          serviceName,
          spanEndpoint: 'http://localhost:8360',
        });

        assert.ok(sdk instanceof NodeSDK);
      });

      it('should be settable by environment', () => {
        process.env.LS_ACCESS_TOKEN = token;
        const sdk = lightstep.configureOpenTelemetry({ serviceName });
        assert.ok(sdk instanceof NodeSDK);
      });
    });

    describe('service version', () => {
      it('is added to the resource', () => {
        const serviceVersion = '0.0.1';
        const sdk = lightstep.configureOpenTelemetry({
          token,
          serviceName,
          serviceVersion,
        });
        assert.ok(sdk instanceof NodeSDK);
        sdk.start();
        assert.strictEqual(
          (trace.getTracerProvider() as NodeTracerProvider).resource.labels[
            SERVICE_RESOURCE.VERSION
          ],
          serviceVersion
        );
      });
    });

    describe('propagation', () => {
      it('defaults to b3', () => {
        const sdk = lightstep.configureOpenTelemetry(minimalConfig);

        sdk.start();

        assert.ok(
          propagation['_getGlobalPropagator']() instanceof B3Propagator
        );
      });

      it('can be assigned using a comma delimited string', () => {
        const sdk = lightstep.configureOpenTelemetry({
          token,
          serviceName,
          propagators: 'b3,tracecontext',
        });

        sdk.start();

        const propagator = propagation['_getGlobalPropagator']();
        assert.ok(propagator instanceof CompositePropagator);

        const [b3, tc] = propagator['_propagators'];
        assert.ok(b3 instanceof B3Propagator);
        assert.ok(tc instanceof HttpTraceContext);
      });

      it('can be assigned using a comma delimited string from environment', () => {
        process.env.OTEL_PROPAGATORS = 'b3,tracecontext';
        const sdk = lightstep.configureOpenTelemetry(minimalConfig);

        sdk.start();

        const propagator = propagation['_getGlobalPropagator']();
        assert.ok(propagator instanceof CompositePropagator);

        const [b3, tc] = propagator['_propagators'];
        assert.ok(b3 instanceof B3Propagator);
        assert.ok(tc instanceof HttpTraceContext);
      });

      it('raises exception for unknown propagator string', () => {
        assert.throws(
          () => {
            const sdk = lightstep.configureOpenTelemetry({
              token,
              serviceName,
              propagators: 'b3,foo',
            });

            sdk.start();
          },
          err => {
            assert(err instanceof LightstepConfigurationError);
            assert.match(
              err.message,
              /^Invalid configuration: unknown propagator specified: foo/
            );
            return true;
          }
        );
      });
    });
  });
});
