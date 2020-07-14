import { NodeSDKConfiguration } from '@opentelemetry/sdk-node';

export interface LightstepNodeSDKConfiguration extends NodeSDKConfiguration {
  token?: string;
  satelliteUrl?: string;
  serviceName: string;
  serviceVersion?: string;
  failureHandler?: (message: string) => void;
}

export class LightstepConfigurationError extends Error {}
