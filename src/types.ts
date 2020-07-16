import {
  B3Propagator,
  HttpCorrelationContext,
  HttpTraceContext,
} from '@opentelemetry/core';
import { NodeSDKConfiguration } from '@opentelemetry/sdk-node';

/** Lightstep configuration (build on NodeSDKConfiguration) */
export interface LightstepNodeSDKConfiguration extends NodeSDKConfiguration {
  token?: string;
  spanEndpoint?: string;
  serviceName: string;
  serviceVersion?: string;
  propagators?: string;
  failureHandler?: (message: string) => void;
}

/** Lightstep configuration error */
export class LightstepConfigurationError extends Error {}

/** Supported propagation formats */
export type PropagationFormat = 'b3' | 'tracecontext' | 'correlationcontext';

export const PROPAGATION_FORMATS: { [key: string]: PropagationFormat } = {
  B3: 'b3',
  TRACECONTEXT: 'tracecontext',
  CORRELATIONCONTEXT: 'correlationcontext',
};

/** Map of propagation format to class implementing the format */
export const PROPAGATOR_LOOKUP_MAP: {
  [key: string]:
    | typeof B3Propagator
    | typeof HttpTraceContext
    | typeof HttpCorrelationContext;
} = {
  b3: B3Propagator,
  tracecontext: HttpTraceContext,
  correlationcontext: HttpCorrelationContext,
};

/** Enumeration known Lightstep environment variable names */
export interface LightstepEnv {
  LS_ACCESS_TOKEN?: string;
  LS_SERVICE_NAME?: string;
  OTEL_EXPORTER_OTLP_SPAN_ENDPOINT?: string;
  OTEL_PROPAGATORS?: string;
}

/** Mapping of environment variable name to LightstepNodeSDKConfiguration name */
export const LS_OPTION_ALIAS_MAP: {
  [K in keyof LightstepEnv]: keyof LightstepNodeSDKConfiguration;
} = {
  LS_ACCESS_TOKEN: 'token',
  LS_SERVICE_NAME: 'serviceName',
  OTEL_EXPORTER_OTLP_SPAN_ENDPOINT: 'spanEndpoint',
  OTEL_PROPAGATORS: 'propagators',
};

/** Default values for LightstepNodeSDKConfiguration */
export const LS_DEFAULTS: Partial<LightstepNodeSDKConfiguration> = {
  spanEndpoint: 'https://ingest.lightstep.com:443/api/v2/otel/trace',
  propagators: PROPAGATION_FORMATS.B3,
};
