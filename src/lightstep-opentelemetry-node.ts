import { NodeSDK } from '@opentelemetry/sdk-node';
import { LightstepNodeSDKConfiguration } from './types';

export function configureOpenTelemetry(
  config: Partial<LightstepNodeSDKConfiguration>
): NodeSDK {
  return new NodeSDK(config);
}
