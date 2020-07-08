import { NodeSDKConfiguration } from '@opentelemetry/sdk-node';

export interface LightstepNodeSDKConfiguration extends NodeSDKConfiguration {
  token?: string;
  satelliteUrl?: string;
}
