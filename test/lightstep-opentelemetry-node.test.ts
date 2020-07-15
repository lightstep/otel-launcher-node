import * as assert from 'assert';
import { lightstep, LightstepConfigurationError } from '../src';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { trace, metrics, context, propagation } from '@opentelemetry/api';
import {
  B3Propagator,
  CompositePropagator,
  HttpTraceContext,
} from '@opentelemetry/core';

describe('Lightstep OpenTelemetry Node', () => {
  describe('configureSDK', () => {
    beforeEach(() => {
      delete process.env.LS_ACCESS_TOKEN;
      delete process.env.LS_SERVICE_NAME;
      delete process.env.LS_SERVICE_VERSION;
      delete process.env.OTEL_PROPAGATORS;

      trace.disable();
      metrics.disable();
      context.disable();
      propagation.disable();
    });

    describe('minimal configuration', () => {
      it('should require access token and serviceName', () => {
        const sdk = lightstep.configureOpenTelemetry({
          token: 'x'.repeat(32),
          serviceName: 'test-service',
        });
        assert.ok(sdk instanceof NodeSDK);
      });
    });

    describe('service name', () => {
      it('is required', () => {
        assert.throws(
          () => lightstep.configureOpenTelemetry({ token: 'x'.repeat(32) }),
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
        const sdk = lightstep.configureOpenTelemetry({
          token: 'x'.repeat(32),
        });
        assert.ok(sdk instanceof NodeSDK);
      });
    });

    describe('access token', () => {
      it('is required for prod', () => {
        assert.throws(
          () =>
            lightstep.configureOpenTelemetry({ serviceName: 'test-service' }),
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
          serviceName: 'test-service',
          spanEndpoint: 'http://localhost:8360',
        });

        assert.ok(sdk instanceof NodeSDK);
      });

      it('should be settable by environment', () => {
        process.env.LS_ACCESS_TOKEN = 'x'.repeat(32);
        const sdk = lightstep.configureOpenTelemetry({
          serviceName: 'test-service',
        });
        assert.ok(sdk instanceof NodeSDK);
      });
    });

    describe('propagation', () => {
      it('defaults to b3', () => {
        const sdk = lightstep.configureOpenTelemetry({
          token: 'x'.repeat(32),
          serviceName: 'test-service',
        });

        sdk.start();

        assert.ok(
          propagation['_getGlobalPropagator']() instanceof B3Propagator
        );
      });

      it('can be assigned using a comma delimited string', () => {
        const sdk = lightstep.configureOpenTelemetry({
          token: 'x'.repeat(32),
          serviceName: 'test-service',
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
        const sdk = lightstep.configureOpenTelemetry({
          token: 'x'.repeat(32),
          serviceName: 'test-service',
        });

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
              token: 'x'.repeat(32),
              serviceName: 'test-service',
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
