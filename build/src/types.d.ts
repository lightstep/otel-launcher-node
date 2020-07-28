import { NodeSDKConfiguration } from '@opentelemetry/sdk-node';
/** Mapping of environment variable names to LightstepNodeSDKConfiguration names */
export declare enum LS_OPTION_ALIAS_MAP {
    LS_ACCESS_TOKEN = "accessToken",
    LS_SERVICE_NAME = "serviceName",
    LS_SERVICE_VERSION = "serviceVersion",
    OTEL_EXPORTER_OTLP_SPAN_ENDPOINT = "spanEndpoint",
    OTEL_EXPORTER_OTLP_METRIC_ENDPOINT = "metricEndpoint",
    OTEL_PROPAGATORS = "propagators"
}
export declare type LightstepEnvType = {
    [key in keyof typeof LS_OPTION_ALIAS_MAP]: string;
};
export declare type LightstepConfigType = Record<LS_OPTION_ALIAS_MAP, string>;
export declare type FailureHandler = (message: string) => void;
/** Lightstep environment variable names */
export declare type LightstepEnv = Partial<LightstepEnvType>;
/** Lightstep flavored configuration for the OpenTelemetry JS SDK */
export interface LightstepNodeSDKConfiguration extends Partial<LightstepConfigType>, NodeSDKConfiguration {
    failureHandler?: FailureHandler;
}
/** Lightstep configuration error */
export declare class LightstepConfigurationError extends Error {
}
/** Supported propagation formats */
export declare type PropagationFormat = 'b3' | 'tracecontext' | 'correlationcontext';
//# sourceMappingURL=types.d.ts.map