import * as assert from 'assert';
import { lightstep } from '../src';
import { NodeSDK } from '@opentelemetry/sdk-node';

describe('Lightstep OpenTelemetry Node', () => {
  describe('configureSDK', () => {
    it('should allow access token configuration', () => {
      const sdk = lightstep.configureOpenTelemetry({ token: 'xxxxxx' });
      assert.ok(sdk instanceof NodeSDK);
    });
  });
});
