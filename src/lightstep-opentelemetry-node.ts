import {
  ConsoleLogger,
  LogLevel,
  B3Propagator,
  CompositePropagator,
  HttpCorrelationContext,
  HttpTraceContext,
} from '@opentelemetry/core';
import { HttpTextPropagator, Logger } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  LightstepNodeSDKConfiguration,
  LightstepConfigurationError,
} from './types';
import {
  CollectorTraceExporter,
  CollectorProtocolNode,
} from '@opentelemetry/exporter-collector';

const OPTION_ALIAS_MAP: { [key: string]: string } = {
  LS_ACCESS_TOKEN: 'token',
  LS_SERVICE_NAME: 'serviceName',
  OTEL_EXPORTER_OTLP_SPAN_ENDPOINT: 'spanEndpoint',
  OTEL_PROPAGATORS: 'propagators',
};

const DEFAULTS: Partial<LightstepNodeSDKConfiguration> = {
  spanEndpoint: 'https://ingest.lightstep.com:443/api/v2/otel/trace',
  propagators: 'b3',
};

let logger: Logger;
let fail: (message: string) => void;

/**
 * Returns a NodeSDK object configured using Lightstep defaults with user
 * overrides. Call start on the returned NodeSDK instance to apply the
 * configuration and start the export pipeline.
 * @param config
 */
export function configureOpenTelemetry(
  config: Partial<LightstepNodeSDKConfiguration> = {}
): NodeSDK {
  logger = setupLogger(config);
  fail = config.failureHandler || defaultFailureHandler(logger);

  config = coalesceConfig(config);
  validateConfiguration(config);
  configurePropagation(config);
  configureTraceExporter(config);

  return new NodeSDK(config);
}

/**
 * Setup up logger to use for LOCL. This may or may not be the logger configured
 * for OpenTelemetry. This is so we can print meaningful error messages when
 * configuration fails.
 */
function setupLogger(config: Partial<LightstepNodeSDKConfiguration>): Logger {
  if (config.logger) return config.logger;

  let logLevel: LogLevel = config.logLevel ?? LogLevel.INFO;

  if (process.env.OTEL_LOG_LEVEL) {
    logLevel =
      LogLevel[
        process.env.OTEL_LOG_LEVEL.toUpperCase() as keyof typeof LogLevel
      ] ?? logLevel;
  }
  return new ConsoleLogger(logLevel);
}

/**
 * Merges configuration with the follow precedence: config from environment,
 * code level configuration, default configuration. Returns a new configuration.
 * @param config
 */
function coalesceConfig(
  config: Partial<LightstepNodeSDKConfiguration>
): Partial<LightstepNodeSDKConfiguration> {
  return Object.assign({}, DEFAULTS, config, configFromEnvironment());
}

/**
 * Iterates through known environment variable keys and returns an object with
 * keys using lightstep conventions
 */
function configFromEnvironment(): { [key: string]: string } {
  return Object.entries(OPTION_ALIAS_MAP).reduce((acc, [envName, optName]) => {
    const value = process.env[envName];
    if (value) acc[optName] = value;
    return acc;
  }, {} as { [key: string]: string });
}

/**
 * The default failure handler. It logs a message at error level and raises
 * an exception. Can be overridden by passing a custom failureHandler in
 * LightstepNodeSDKConfiguration
 * @param logger
 */
function defaultFailureHandler(logger: Logger) {
  return (message: string) => {
    logger.error(message);
    throw new LightstepConfigurationError(message);
  };
}

/**
 * Makes upfront validations on configuration issues known to cause failures.
 * @param config
 */
function validateConfiguration(config: Partial<LightstepNodeSDKConfiguration>) {
  validateToken(config);
  validateServiceName(config);
}

/**
 * Validates that a token is present if the spanEndpoint is for LS SaaS.
 * The token might be optional for other spanEndpoints, but will depend on their
 * configuration. If a token is provided, we validate its length.
 * @param config
 */
function validateToken(config: Partial<LightstepNodeSDKConfiguration>) {
  if (!config.token && config.spanEndpoint === DEFAULTS.spanEndpoint) {
    fail(
      `Invalid configuration: access token missing, must be set when reporting to ${config.spanEndpoint}. Set LS_ACCESS_TOKEN env var or configure token in code`
    );
  }

  if (!config.token) return;

  if (![32, 84, 104].includes(config.token.length)) {
    fail(
      `Invalid configuration: access token length incorrect. Ensure token is set correctly`
    );
  }
}

/**
 * Validates that the service name is present
 * @param config
 */
function validateServiceName(config: Partial<LightstepNodeSDKConfiguration>) {
  if (!config.serviceName)
    fail(
      'Invalid configuration: service name missing. Set LS_SERVICE_NAME env var or configure serviceName in code'
    );
}

/**
 * Configures export as JSON over HTTP to the configured spanEndpoint
 * @param config
 * @todo support more formats
 */
function configureTraceExporter(
  config: Partial<LightstepNodeSDKConfiguration>
) {
  if (config.traceExporter) return;

  const headers: { [key: string]: string } = {};
  if (config.token) headers['lightstep-access-token'] = config.token;

  config.traceExporter = new CollectorTraceExporter({
    protocolNode: CollectorProtocolNode.HTTP_JSON,
    serviceName: config.serviceName,
    url: config.spanEndpoint,
    headers,
  });
}

const PROPAGATOR_LOOKUP_MAP: {
  [key: string]:
    | typeof B3Propagator
    | typeof HttpTraceContext
    | typeof HttpCorrelationContext;
} = {
  b3: B3Propagator,
  tracecontext: HttpTraceContext,
  correlationcontext: HttpCorrelationContext,
};

/**
 * Instantiates a propagator based on a string name where the name appears in
 * as a key in the PROPAGATOR_LOOKUP_MAP. Current supported names are: b3,
 * tracecontext, correlationcontext.
 * @param name
 */
function createPropagator(name: string): HttpTextPropagator {
  const propagatorClass = PROPAGATOR_LOOKUP_MAP[name];
  if (!propagatorClass) {
    fail(
      `Invalid configuration: unknown propagator specified: ${name}. Supported propagators are: b3, tracecontext, correlationcontext`
    );
  }

  return new propagatorClass();
}

/**
 * Configures propagators based on a comma delimited string from the config.
 * If more than one propagator is specified, a composite propagator will be
 * configured with mutiple formats. Supported string formats are b3,
 * tracecontext, and correlationcontext.
 * @param config
 */
function configurePropagation(config: Partial<LightstepNodeSDKConfiguration>) {
  const propagators: Array<HttpTextPropagator> = (
    config.propagators?.split(',') || ['b3']
  ).map(name => createPropagator(name.trim()));
  if (propagators.length > 1) {
    config.httpTextPropagator = new CompositePropagator({ propagators });
  } else {
    config.httpTextPropagator = propagators[0];
  }
}
