import { DiagLogger, DiagLogLevel } from '@opentelemetry/api';
import { NodeSDKConfiguration } from '@opentelemetry/sdk-node';

/** Lightstep specific configuration options */
export interface LightstepConfigType {
  accessToken?: string;
  // metricsHostEnabled?: boolean;
  serviceName?: string;
  serviceVersion?: string;
  spanEndpoint?: string;
  // metricEndpoint?: string;
  propagators?: string;
  logger?: DiagLogger;
  logLevel?: DiagLogLevel;
}

/** Lightstep environment variable names */
export interface LightstepEnvType {
  LS_ACCESS_TOKEN?: string;
  LS_METRICS_HOST_ENABLED?: string;
  LS_SERVICE_NAME?: string;
  LS_SERVICE_VERSION?: string;
  OTEL_EXPORTER_OTLP_SPAN_ENDPOINT?: string;
  OTEL_EXPORTER_OTLP_METRIC_ENDPOINT?: string;
  OTEL_PROPAGATORS?: string;
}

export type LightstepEnv = Partial<LightstepEnvType>;

export type FailureHandler = (message: string) => void;

/** Lightstep flavored configuration for the OpenTelemetry JS SDK */
export interface LightstepNodeSDKConfiguration
  extends Partial<LightstepConfigType>,
    NodeSDKConfiguration {
  failureHandler?: FailureHandler;
}

/** Lightstep configuration error */
export class LightstepConfigurationError extends Error {}

/** Supported propagation formats */
export type PropagationFormat = 'b3' | 'b3single' | 'tracecontext' | 'baggage';
