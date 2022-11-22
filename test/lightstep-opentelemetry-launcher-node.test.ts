import {
  context,
  DiagLogLevel,
  propagation,
  trace,
  metrics,
  createNoopMeter,
} from '@opentelemetry/api';
import {
  CompositePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { B3Propagator } from '@opentelemetry/propagator-b3';
import { Resource } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import * as assert from 'assert';
import * as os from 'os';
import * as sinon from 'sinon';
import { lightstep, LightstepConfigurationError, LightstepEnv } from '../src';
import { VERSION } from '../src/version';

describe('Lightstep OpenTelemetry Launcher Node', () => {
  describe('configureSDK', () => {
    const accessToken = 'x'.repeat(32);
    const serviceName = 'test-service';
    const minimalConfig = {
      accessToken,
      serviceName,
      logLevel: DiagLogLevel.NONE,
    };

    beforeEach(() => {
      Object.keys(process.env as LightstepEnv).forEach(
        k => delete process.env[k]
      );

      trace.disable();
      context.disable();
      propagation.disable();
    });

    describe('minimal configuration', () => {
      it('should require access token and serviceName', () => {
        const sdk = lightstep.configureOpenTelemetry({
          logLevel: DiagLogLevel.NONE,
          accessToken,
          serviceName,
        });
        assert.ok(sdk instanceof NodeSDK);
      });
    });

    describe('service name', () => {
      it('is required', () => {
        assert.throws(
          () =>
            lightstep.configureOpenTelemetry({
              accessToken,
              logLevel: DiagLogLevel.NONE,
            }),
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
          accessToken,
          logLevel: DiagLogLevel.NONE,
        });
        assert.ok(sdk instanceof NodeSDK);
      });

      it('is added to the resource', async () => {
        const sdk = lightstep.configureOpenTelemetry({
          logLevel: DiagLogLevel.NONE,
          accessToken,
          serviceName,
        });
        assert.ok(sdk instanceof NodeSDK);
        await sdk.start();
        const tracer = (
          trace.getTracerProvider() as NodeTracerProvider
        ).getTracer('test');
        assert.strictEqual(
          tracer.resource.attributes[SemanticResourceAttributes.SERVICE_NAME],
          serviceName
        );
      });
    });

    describe('access token', () => {
      it('is required for prod', () => {
        assert.throws(
          () =>
            lightstep.configureOpenTelemetry({
              serviceName,
              logLevel: DiagLogLevel.NONE,
            }),
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
          logLevel: DiagLogLevel.NONE,
          serviceName,
          spanEndpoint: 'http://localhost:8360',
        });

        assert.ok(sdk instanceof NodeSDK);
      });

      it('should be settable by environment', () => {
        process.env.LS_ACCESS_TOKEN = accessToken;
        const sdk = lightstep.configureOpenTelemetry({
          serviceName,
          logLevel: DiagLogLevel.NONE,
        });
        assert.ok(sdk instanceof NodeSDK);
      });
    });

    describe('service version', async () => {
      it('is added to the resource', async () => {
        const serviceVersion = '0.0.1';
        const sdk = lightstep.configureOpenTelemetry({
          logLevel: DiagLogLevel.NONE,
          accessToken,
          serviceName,
          serviceVersion,
        });
        assert.ok(sdk instanceof NodeSDK);

        await sdk.start();
        const tracer = (
          trace.getTracerProvider() as NodeTracerProvider
        ).getTracer('test');
        assert.strictEqual(
          tracer.resource.attributes[
            SemanticResourceAttributes.SERVICE_VERSION
          ],
          serviceVersion
        );
      });
    });

    describe('hostname', () => {
      const stubbedHostname = 'hostymcstubs.local';
      let sandbox: sinon.SinonSandbox;

      beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(os, 'hostname').returns(stubbedHostname);
      });

      afterEach(() => {
        sandbox.restore();
      });

      it('is added to resource by default', async () => {
        const sdk = lightstep.configureOpenTelemetry(minimalConfig);
        assert.ok(sdk instanceof NodeSDK);

        await sdk.start();

        const tracer = (
          trace.getTracerProvider() as NodeTracerProvider
        ).getTracer('test');

        assert.strictEqual(
          tracer.resource.attributes[SemanticResourceAttributes.HOST_NAME],
          stubbedHostname
        );
      });

      it('is set to user-provided host name, if provided', async () => {
        const resource = new Resource({
          [SemanticResourceAttributes.HOST_NAME]: 'customhost.local',
        });
        const sdk = lightstep.configureOpenTelemetry({
          ...minimalConfig,
          resource,
        });
        assert.ok(sdk instanceof NodeSDK);

        await sdk.start();

        const tracer = (
          trace.getTracerProvider() as NodeTracerProvider
        ).getTracer('test');

        assert.strictEqual(
          tracer.resource.attributes[SemanticResourceAttributes.HOST_NAME],
          'customhost.local'
        );
      });

      it('is set to env.HOSTNAME, if provided', async () => {
        sandbox.stub(process, 'env').value({ HOSTNAME: 'envhost.local' });

        const sdk = lightstep.configureOpenTelemetry(minimalConfig);
        assert.ok(sdk instanceof NodeSDK);

        await sdk.start();

        const tracer = (
          trace.getTracerProvider() as NodeTracerProvider
        ).getTracer('test');

        assert.strictEqual(
          tracer.resource.attributes[SemanticResourceAttributes.HOST_NAME],
          'envhost.local'
        );
      });
    });

    describe('telemetry.distro', async () => {
      it('is added to the resource', async () => {
        const sdk = lightstep.configureOpenTelemetry({
          logLevel: DiagLogLevel.NONE,
          accessToken,
          serviceName,
        });
        assert.ok(sdk instanceof NodeSDK);

        await sdk.start();
        const tracer = (
          trace.getTracerProvider() as NodeTracerProvider
        ).getTracer('test');
        assert.strictEqual(
          tracer.resource.attributes['telemetry.distro.name'],
          'lightstep'
        );
        assert.strictEqual(
          tracer.resource.attributes['telemetry.distro.version'],
          VERSION
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
          logLevel: DiagLogLevel.NONE,
          accessToken,
          serviceName,
          propagators: 'b3,tracecontext',
        });

        await sdk.start();
        const propagator = propagation['_getGlobalPropagator']();
        assert.ok(propagator instanceof CompositePropagator);

        const [b3, tc] = propagator['_propagators'];
        assert.ok(b3 instanceof B3Propagator);
        assert.ok(tc instanceof W3CTraceContextPropagator);
      });

      it('can be assigned using a comma delimited string', async () => {
        const sdk = lightstep.configureOpenTelemetry({
          logLevel: DiagLogLevel.NONE,
          accessToken,
          serviceName,
          propagators: 'b3single,tracecontext',
        });

        await sdk.start();
        const propagator = propagation['_getGlobalPropagator']();
        assert.ok(propagator instanceof CompositePropagator);

        const [b3, tc] = propagator['_propagators'];
        assert.ok(b3 instanceof B3Propagator);
        assert.ok(tc instanceof W3CTraceContextPropagator);
      });

      it('can be assigned using a comma delimited string from environment', async () => {
        process.env.OTEL_PROPAGATORS = 'b3,tracecontext';
        const sdk = lightstep.configureOpenTelemetry(minimalConfig);

        await sdk.start();
        const propagator = propagation['_getGlobalPropagator']();
        assert.ok(propagator instanceof CompositePropagator);

        const [b3, tc] = propagator['_propagators'];
        assert.ok(b3 instanceof B3Propagator);
        assert.ok(tc instanceof W3CTraceContextPropagator);
      });

      it('raises exception for unknown propagator string', async () => {
        // eslint-disable-next-line
        await assert.rejects(
          async () => {
            const sdk = lightstep.configureOpenTelemetry({
              logLevel: DiagLogLevel.NONE,
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
        const propagator = new W3CTraceContextPropagator();
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

    describe('metrics', () => {
      const noopMeter = createNoopMeter();

      it('is disabled by default', async () => {
        const sdk = lightstep.configureOpenTelemetry(minimalConfig);
        assert.ok(sdk instanceof NodeSDK);

        await sdk.start();

        assert.strictEqual(metrics.getMeter('test'), noopMeter);
      });

      it('can be enabled by code', async () => {
        const sdk = lightstep.configureOpenTelemetry({
          ...minimalConfig,
          metricsEnabled: true,
        });
        assert.ok(sdk instanceof NodeSDK);

        await sdk.start();

        // a non-noop meter indicates the metrics sdk was configured
        assert.notStrictEqual(metrics.getMeter('test'), noopMeter);
      });

      it('can be enabled by environment variable', async () => {
        process.env.LS_METRICS_ENABLED = 'true';
        const sdk = lightstep.configureOpenTelemetry(minimalConfig);
        assert.ok(sdk instanceof NodeSDK);

        await sdk.start();

        // a non-noop meter indicates the metrics sdk was configured
        assert.notStrictEqual(metrics.getMeter('test'), noopMeter);
      });
    });
  });
});
