import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core';
import {
  TextMapPropagator,
  diag,
  DiagLogger,
  DiagLogLevel,
  DiagConsoleLogger,
} from '@opentelemetry/api';
import { B3InjectEncoding, B3Propagator } from '@opentelemetry/propagator-b3';
import { NodeSDK } from '@opentelemetry/sdk-node';
// not released
// import { NodeSDK } from '@opentelemetry/sdk-node';
import * as types from './types';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { Resource, ResourceAttributes } from '@opentelemetry/resources';

import * as os from 'os';

import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const PROPAGATION_FORMATS: { [key: string]: types.PropagationFormat } = {
  B3: 'b3',
  B3SINGLE: 'b3single',
  TRACECONTEXT: 'tracecontext',
  BAGGAGE: 'baggage',
};

/** Map of propagation format to class implementing the format */
const PROPAGATOR_LOOKUP_MAP: {
  [key: string]:
    | typeof B3Propagator
    | typeof W3CTraceContextPropagator
    | typeof W3CBaggagePropagator;
} = {
  b3: B3Propagator,
  b3single: B3Propagator,
  tracecontext: W3CTraceContextPropagator,
  baggage: W3CBaggagePropagator,
};

/** Default values for LightstepNodeSDKConfiguration */
const LS_DEFAULTS: Partial<types.LightstepNodeSDKConfiguration> = {
  spanEndpoint: 'https://ingest.lightstep.com/traces/otlp/v0.6',
  propagators: PROPAGATION_FORMATS.B3,
};

const ACCESS_TOKEN_HEADER = 'Lightstep-Access-Token';

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
  setupLogger(config);
  fail = config.failureHandler || defaultFailureHandler(diag);

  config = coalesceConfig(config);
  validateConfiguration(config);
  configureBaseResource(config);
  configurePropagation(config);
  configureTraceExporter(config);
  configureInstrumentations(config);

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
): void {
  if (config.logger) {
    diag.setLogger(config.logger, config.logLevel);
    return;
  }

  let logLevel: DiagLogLevel;

  if (config.logLevel !== undefined) {
    logLevel = config.logLevel;
  } else if (process.env.OTEL_LOG_LEVEL) {
    logLevel =
      DiagLogLevel[
        process.env.OTEL_LOG_LEVEL.toUpperCase() as keyof typeof DiagLogLevel
      ];
  } else {
    logLevel = DiagLogLevel.INFO;
  }
  diag.setLogger(new DiagConsoleLogger(), logLevel);
}

/**
 * Merges configuration with the following precedence: code config, config from
 * environment, default configuration. Returns a new configuration.
 * @param config
 */
function coalesceConfig(
  config: Partial<types.LightstepNodeSDKConfiguration>
): Partial<types.LightstepNodeSDKConfiguration> {
  const envConfig: Partial<types.LightstepNodeSDKConfiguration> =
    configFromEnvironment();
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
  diag.debug('Default config: ', defaults);
  diag.debug('Default config: ', defaults);
  diag.debug('Config from environment', envConfig);
  diag.debug('Default config: ', defaults);
  diag.debug('Config from code: ', lsConfig);
  diag.debug('Default config: ', defaults);
  diag.debug('Merged Config', mergedConfig);
}

/**
 * Iterates through known environment variable keys and returns an object with
 * keys using lightstep conventions
 */
function configFromEnvironment(): Partial<types.LightstepNodeSDKConfiguration> {
  const env: types.LightstepEnv = process.env;
  const envConfig: Partial<types.LightstepNodeSDKConfiguration> = {};
  if (env.LS_ACCESS_TOKEN) envConfig.accessToken = env.LS_ACCESS_TOKEN;
  if (env.LS_SERVICE_NAME) envConfig.serviceName = env.LS_SERVICE_NAME;
  if (env.LS_SERVICE_VERSION) envConfig.serviceVersion = env.LS_SERVICE_VERSION;
  if (env.OTEL_EXPORTER_OTLP_SPAN_ENDPOINT)
    envConfig.spanEndpoint = env.OTEL_EXPORTER_OTLP_SPAN_ENDPOINT;
  if (env.OTEL_PROPAGATORS) envConfig.propagators = env.OTEL_PROPAGATORS;
  return envConfig;
}

/**
 * The default failure handler. It logs a message at error level and raises
 * an exception. Can be overridden by passing a custom failureHandler in
 * LightstepNodeSDKConfiguration
 * @param logger
 */
function defaultFailureHandler(logger: DiagLogger): types.FailureHandler {
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
  const attributes: ResourceAttributes = {
    [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName!,
  };
  if (config.serviceVersion) {
    attributes[SemanticResourceAttributes.SERVICE_VERSION] =
      config.serviceVersion;
  }

  attributes[SemanticResourceAttributes.HOST_NAME] =
    process.env.HOSTNAME || os.hostname();

  const baseResource: Resource = new Resource(attributes);

  if (config.resource) {
    config.resource = baseResource.merge(config.resource);
  } else {
    config.resource = baseResource;
  }
}

/**
 * Configures instrumentations
 * @param config
 */
function configureInstrumentations(
  config: Partial<types.LightstepNodeSDKConfiguration>
) {
  if (config.instrumentations) {
    return;
  }

  config.instrumentations = [getNodeAutoInstrumentations()];
}

/**
 * Configures export as JSON over HTTP to the configured spanEndpoint
 * @param config
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

  config.traceExporter = new OTLPTraceExporter({
    url: config.spanEndpoint,
    headers,
  });
}

/**
 * Instantiates a propagator based on a string name where the name appears in
 * as a key in the PROPAGATOR_LOOKUP_MAP. Current supported names are: b3,
 * tracecontext, correlationcontext.
 * @param name
 */
function createPropagator(name: types.PropagationFormat): TextMapPropagator {
  const propagatorClass = PROPAGATOR_LOOKUP_MAP[name];
  if (!propagatorClass) {
    fail(
      `Invalid configuration: unknown propagator specified: ${name}. Supported propagators are: b3, b3single, baggage, tracecontext`
    );
  }
  if (name === 'b3') {
    return new propagatorClass({
      injectEncoding: B3InjectEncoding.MULTI_HEADER,
    });
  } else if (name === 'b3single') {
    return new propagatorClass({
      injectEncoding: B3InjectEncoding.SINGLE_HEADER,
    });
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
  if (config.textMapPropagator) {
    return;
  }

  const propagators: Array<TextMapPropagator> = (
    config.propagators?.split(',') || [PROPAGATION_FORMATS.B3]
  ).map(name => createPropagator(name.trim() as types.PropagationFormat));
  if (propagators.length > 1) {
    config.textMapPropagator = new CompositePropagator({ propagators });
  } else {
    config.textMapPropagator = propagators[0];
  }
}
