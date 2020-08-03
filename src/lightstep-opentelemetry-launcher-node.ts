import {
  ConsoleLogger,
  LogLevel,
  CompositePropagator,
  B3Propagator,
  HttpCorrelationContext,
  HttpTraceContext,
} from '@opentelemetry/core';
import { HttpTextPropagator, Logger } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import * as types from './types';
import {
  CollectorTraceExporter,
  CollectorProtocolNode,
} from '@opentelemetry/exporter-collector';
import {
  Resource,
  ResourceLabels,
  SERVICE_RESOURCE,
} from '@opentelemetry/resources';

const PROPAGATION_FORMATS: { [key: string]: types.PropagationFormat } = {
  B3: 'b3',
  TRACECONTEXT: 'tracecontext',
  CORRELATIONCONTEXT: 'correlationcontext',
};

/** Map of propagation format to class implementing the format */
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

/** Default values for LightstepNodeSDKConfiguration */
const LS_DEFAULTS: Partial<types.LightstepNodeSDKConfiguration> = {
  spanEndpoint: 'https://ingest.lightstep.com:443/api/v2/otel/trace',
  metricEndpoint: 'https://ingest.lightstep.com:443/metrics',
  propagators: PROPAGATION_FORMATS.B3,
};

const ACCESS_TOKEN_HEADER = 'Lightstep-Access-Token';

let logger: Logger;
let fail: types.FailureHandler;

/**
 * Returns a NodeSDK object configured using Lightstep defaults with user
 * overrides. Call start on the returned NodeSDK instance to apply the
 * configuration and start the export pipeline.
 * @param config
 */
export function configureOpenTelemetry(
  config: Partial<types.LightstepNodeSDKConfiguration> = {}
): NodeSDK {
  logger = setupLogger(config);
  fail = config.failureHandler || defaultFailureHandler(logger);

  config = coalesceConfig(config);
  validateConfiguration(config);
  configureBaseResource(config);
  configurePropagation(config);
  configureTraceExporter(config);

  return new NodeSDK(config);
}

/**
 * Setup up logger to use for Launcher. This may or may not be the logger
 * configured for OpenTelemetry. This is so we can print meaningful error
 * messages when configuration fails. Note, when provided by environment variable,
 * log level is interpreted as a string. In code configuration uses the LogLevel
 * enum from @openelemetry/core
 */
function setupLogger(
  config: Partial<types.LightstepNodeSDKConfiguration>
): Logger {
  if (config.logger) {
    return config.logger;
  }

  let logLevel: LogLevel;

  if (config.logLevel !== undefined) {
    logLevel = config.logLevel;
  } else if (process.env.OTEL_LOG_LEVEL) {
    logLevel =
      LogLevel[
        process.env.OTEL_LOG_LEVEL.toUpperCase() as keyof typeof LogLevel
      ];
  } else {
    logLevel = LogLevel.INFO;
  }

  const logger = new ConsoleLogger(logLevel);

  if (logLevel === LogLevel.DEBUG && !config.logger) {
    config.logger = logger;
  }

  return logger;
}

/**
 * Merges configuration with the following precedence: code config, config from
 * environment, default configuration. Returns a new configuration.
 * @param config
 */
function coalesceConfig(
  config: Partial<types.LightstepNodeSDKConfiguration>
): Partial<types.LightstepNodeSDKConfiguration> {
  const envConfig: Partial<types.LightstepNodeSDKConfiguration> = configFromEnvironment();
  const mergedConfig: Partial<types.LightstepNodeSDKConfiguration> = {
    ...LS_DEFAULTS,
    ...envConfig,
    ...config,
  };
  logConfig(LS_DEFAULTS, envConfig, config, mergedConfig);
  return mergedConfig;
}

/**
 * Log configuration from individual sources and the effective, merged config
 */
function logConfig(
  defaults: Partial<types.LightstepNodeSDKConfiguration>,
  envConfig: Partial<types.LightstepNodeSDKConfiguration>,
  lsConfig: Partial<types.LightstepNodeSDKConfiguration>,
  mergedConfig: Partial<types.LightstepNodeSDKConfiguration>
) {
  logger.debug('Default config: ', defaults);
  logger.debug('Config from environment', envConfig);
  logger.debug('Config from code: ', lsConfig);
  logger.debug('Merged Config', mergedConfig);
}

/**
 * Iterates through known environment variable keys and returns an object with
 * keys using lightstep conventions
 */
function configFromEnvironment(): Partial<types.LightstepNodeSDKConfiguration> {
  const env = process.env as types.LightstepEnv;
  return Object.entries(types.LS_OPTION_ALIAS_MAP).reduce(
    (acc, [envName, optName]) => {
      const value = env[envName as keyof types.LightstepEnv];
      if (value && optName) {
        acc[optName] = value;
      }
      return acc;
    },
    {} as types.LightstepConfigType
  );
}

/**
 * The default failure handler. It logs a message at error level and raises
 * an exception. Can be overridden by passing a custom failureHandler in
 * LightstepNodeSDKConfiguration
 * @param logger
 */
function defaultFailureHandler(logger: Logger): types.FailureHandler {
  return (message: string) => {
    logger.error(message);
    throw new types.LightstepConfigurationError(message);
  };
}

/**
 * Makes upfront validations on configuration issues known to cause failures.
 * @param config
 */
function validateConfiguration(
  config: Partial<types.LightstepNodeSDKConfiguration>
) {
  validateToken(config);
  validateServiceName(config);
}

/**
 * Validates that a token is present if the spanEndpoint is for LS SaaS.
 * The token might be optional for other spanEndpoints, but will depend on their
 * configuration. If a token is provided, we validate its length.
 * @param config
 */
function validateToken(config: Partial<types.LightstepNodeSDKConfiguration>) {
  if (!config.accessToken && config.spanEndpoint === LS_DEFAULTS.spanEndpoint) {
    fail(
      `Invalid configuration: access token missing, must be set when reporting to ${config.spanEndpoint}. Set LS_ACCESS_TOKEN env var or configure token in code`
    );
  }

  if (!config.accessToken) {
    return;
  }
  // valid access tokens are 32, 84 or 104 characters
  if (![32, 84, 104].includes(config.accessToken.length)) {
    fail(
      'Invalid configuration: access token length incorrect. Ensure token is set correctly'
    );
  }
}

/**
 * Validates that the service name is present
 * @param config
 */
function validateServiceName(
  config: Partial<types.LightstepNodeSDKConfiguration>
) {
  if (!config.serviceName)
    fail(
      'Invalid configuration: service name missing. Set LS_SERVICE_NAME env var or configure serviceName in code'
    );
}

function configureBaseResource(
  config: Partial<types.LightstepNodeSDKConfiguration>
) {
  const labels: ResourceLabels = {
    [SERVICE_RESOURCE.NAME]: config.serviceName!,
  };
  if (config.serviceVersion) {
    labels[SERVICE_RESOURCE.VERSION] = config.serviceVersion;
  }

  const baseResource: Resource = new Resource(labels);

  if (config.resource) {
    config.resource = config.resource.merge(baseResource);
  } else {
    config.resource = baseResource;
  }
}

/**
 * Configures export as JSON over HTTP to the configured spanEndpoint
 * @param config
 * @todo support more formats
 */
function configureTraceExporter(
  config: Partial<types.LightstepNodeSDKConfiguration>
) {
  if (config.traceExporter) {
    return;
  }

  const headers: { [key: string]: string } = {};
  if (config.accessToken) {
    headers[ACCESS_TOKEN_HEADER] = config.accessToken;
  }

  config.traceExporter = new CollectorTraceExporter({
    protocolNode: CollectorProtocolNode.HTTP_JSON,
    serviceName: config.serviceName,
    url: config.spanEndpoint,
    headers,
    logger,
  });
}

/**
 * Instantiates a propagator based on a string name where the name appears in
 * as a key in the PROPAGATOR_LOOKUP_MAP. Current supported names are: b3,
 * tracecontext, correlationcontext.
 * @param name
 */
function createPropagator(name: types.PropagationFormat): HttpTextPropagator {
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
function configurePropagation(
  config: Partial<types.LightstepNodeSDKConfiguration>
) {
  if (config.httpTextPropagator) {
    return;
  }

  const propagators: Array<HttpTextPropagator> = (
    config.propagators?.split(',') || [PROPAGATION_FORMATS.B3]
  ).map(name => createPropagator(name.trim() as types.PropagationFormat));
  if (propagators.length > 1) {
    config.httpTextPropagator = new CompositePropagator({ propagators });
  } else {
    config.httpTextPropagator = propagators[0];
  }
}
