import * as assert from 'assert';
import * as sinon from 'sinon';
import { lightstep, LightstepConfigurationError, LightstepEnv } from '../src';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { trace, metrics, context, propagation } from '@opentelemetry/api';
import {
  B3Propagator,
  CompositePropagator,
  HttpTraceContext,
} from '@opentelemetry/core';
import {
  HOST_RESOURCE,
  SERVICE_RESOURCE,
  Resource,
} from '@opentelemetry/resources';
import { NodeTracerProvider } from '@opentelemetry/node';
import * as os from 'os';

describe('Lightstep OpenTelemetry Launcher Node', () => {
  describe('configureSDK', () => {
    const accessToken = 'x'.repeat(32);
    const serviceName = 'test-service';
    const minimalConfig = { accessToken, serviceName };

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
          accessToken,
          serviceName,
        });
        assert.ok(sdk instanceof NodeSDK);
      });
    });

    describe('service name', () => {
      it('is required', () => {
        assert.throws(
          () => lightstep.configureOpenTelemetry({ accessToken }),
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
        const sdk = lightstep.configureOpenTelemetry({ accessToken });
        assert.ok(sdk instanceof NodeSDK);
      });

      it('is added to the resource', async () => {
        const sdk = lightstep.configureOpenTelemetry({
          accessToken,
          serviceName,
        });
        assert.ok(sdk instanceof NodeSDK);
        await sdk.start();
        const tracer = (trace.getTracerProvider() as NodeTracerProvider).getTracer(
          'test'
        );
        assert.strictEqual(
          tracer.resource.attributes[SERVICE_RESOURCE.NAME],
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
        process.env.LS_ACCESS_TOKEN = accessToken;
        const sdk = lightstep.configureOpenTelemetry({ serviceName });
        assert.ok(sdk instanceof NodeSDK);
      });
    });

    describe('service version', async () => {
      it('is added to the resource', async () => {
        const serviceVersion = '0.0.1';
        const sdk = lightstep.configureOpenTelemetry({
          accessToken,
          serviceName,
          serviceVersion,
        });
        assert.ok(sdk instanceof NodeSDK);

        await sdk.start();
        const tracer = (trace.getTracerProvider() as NodeTracerProvider).getTracer(
          'test'
        );
        assert.strictEqual(
          tracer.resource.attributes[SERVICE_RESOURCE.VERSION],
          serviceVersion
        );
      });
    });

    describe('hostname', () => {
      const stubbedHostname = 'hostymcstubs.local';
      let hostnameStub: sinon.SinonStub;

      beforeEach(() => {
        hostnameStub = sinon.stub(os, 'hostname');
        hostnameStub.returns(stubbedHostname);
      });

      afterEach(() => {
        hostnameStub.restore();
      });

      it('is added to resource by default', async () => {
        const sdk = lightstep.configureOpenTelemetry(minimalConfig);
        assert.ok(sdk instanceof NodeSDK);

        await sdk.start();

        const tracer = (trace.getTracerProvider() as NodeTracerProvider).getTracer(
          'test'
        );

        assert.strictEqual(hostnameStub.callCount, 1);
        assert.strictEqual(
          tracer.resource.attributes[HOST_RESOURCE.NAME],
          stubbedHostname
        );
      });

      it('is set to user-provided host name, if provided', async () => {
        const resource = new Resource({
          [HOST_RESOURCE.NAME]: 'customhost.local',
        });
        const sdk = lightstep.configureOpenTelemetry({
          ...minimalConfig,
          resource,
        });
        assert.ok(sdk instanceof NodeSDK);

        await sdk.start();

        const tracer = (trace.getTracerProvider() as NodeTracerProvider).getTracer(
          'test'
        );

        assert.strictEqual(
          tracer.resource.attributes[HOST_RESOURCE.NAME],
          'customhost.local'
        );
      });

      it('is set to env.HOSTNAME, if provided', async () => {
        process.env.HOSTNAME = 'envhost.local';
        const sdk = lightstep.configureOpenTelemetry(minimalConfig);
        assert.ok(sdk instanceof NodeSDK);

        await sdk.start();

        const tracer = (trace.getTracerProvider() as NodeTracerProvider).getTracer(
          'test'
        );
        delete process.env.HOSTNAME;

        assert.strictEqual(hostnameStub.callCount, 0);
        assert.strictEqual(
          tracer.resource.attributes[HOST_RESOURCE.NAME],
          'envhost.local'
        );
      });
    });

    describe('propagation', () => {
      it('defaults to b3', async () => {
        const sdk = lightstep.configureOpenTelemetry(minimalConfig);

        await sdk.start();
        assert.ok(
          propagation['_getGlobalPropagator']() instanceof B3Propagator
        );
      });

      it('can be assigned using a comma delimited string', async () => {
        const sdk = lightstep.configureOpenTelemetry({
          accessToken,
          serviceName,
          propagators: 'b3,tracecontext',
        });

        await sdk.start();
        const propagator = propagation['_getGlobalPropagator']();
        assert.ok(propagator instanceof CompositePropagator);

        const [b3, tc] = propagator['_propagators'];
        assert.ok(b3 instanceof B3Propagator);
        assert.ok(tc instanceof HttpTraceContext);
      });

      it('can be assigned using a comma delimited string from environment', async () => {
        process.env.OTEL_PROPAGATORS = 'b3,tracecontext';
        const sdk = lightstep.configureOpenTelemetry(minimalConfig);

        await sdk.start();
        const propagator = propagation['_getGlobalPropagator']();
        assert.ok(propagator instanceof CompositePropagator);

        const [b3, tc] = propagator['_propagators'];
        assert.ok(b3 instanceof B3Propagator);
        assert.ok(tc instanceof HttpTraceContext);
      });

      it('raises exception for unknown propagator string', async () => {
        // eslint-disable-next-line
        await assert.rejects(
          async () => {
            const sdk = lightstep.configureOpenTelemetry({
              accessToken,
              serviceName,
              propagators: 'b3,foo',
            });

            await sdk.start();
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

      it('does not override user provided propagator', async () => {
        const propagator = new HttpTraceContext();
        const sdk = lightstep.configureOpenTelemetry({
          ...minimalConfig,
          textMapPropagator: propagator,
        });

        await sdk.start();
        assert.deepStrictEqual(
          propagation['_getGlobalPropagator'](),
          propagator
        );
      });
    });
  });
});
