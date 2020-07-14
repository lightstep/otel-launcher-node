import * as assert from 'assert';
import { lightstep, LightstepConfigurationError } from '../src';
import { NodeSDK } from '@opentelemetry/sdk-node';

describe('Lightstep OpenTelemetry Node', () => {
  describe('configureSDK', () => {
    beforeEach(() => {
      delete process.env.LS_ACCESS_TOKEN;
      delete process.env.LS_SERVICE_NAME;
      delete process.env.LS_SERVICE_VERSION;
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

      it('is not requried for custom sat', () => {
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
  });
});
