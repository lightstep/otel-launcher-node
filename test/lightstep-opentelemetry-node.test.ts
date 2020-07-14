import * as assert from 'assert';
import { lightstep, LightstepConfigurationError } from '../src';
import { NodeSDK } from '@opentelemetry/sdk-node';

describe('Lightstep OpenTelemetry Node', () => {
  describe('configureSDK', () => {
    it('should require access token and serviceName', () => {
      const sdk = lightstep.configureOpenTelemetry({
        token: 'x'.repeat(32),
        serviceName: 'test-service',
      });

      assert.ok(sdk instanceof NodeSDK);
    });

    it('should raise for missing service name', () => {
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

    it('should raise for missing token reporting to prod', () => {
      assert.throws(
        () => lightstep.configureOpenTelemetry({ serviceName: 'test-service' }),
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

    it('should not raise for missing token reporting to custom sat', () => {
      const sdk = lightstep.configureOpenTelemetry({
        serviceName: 'test-service',
        satelliteUrl: 'http://localhost:8360',
      });

      assert.ok(sdk instanceof NodeSDK);
    });
  });
});
