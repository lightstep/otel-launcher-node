import { ConsoleLogger, LogLevel } from '@opentelemetry/core';
import { Logger } from '@opentelemetry/api';
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
};

const DEFAULTS: Partial<LightstepNodeSDKConfiguration> = {
  spanEndpoint: 'https://ingest.lightstep.com:443/api/v2/otel/trace',
};

let logger: Logger;
let fail: (message: string) => void;

export function configureOpenTelemetry(
  config: Partial<LightstepNodeSDKConfiguration> = {}
): NodeSDK {
  logger = setupLogger(config);
  fail = config.failureHandler || defaultFailureHandler(logger);

  config = coalesceConfig(config);
  validateConfiguration(config);
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

function coalesceConfig(
  config: Partial<LightstepNodeSDKConfiguration>
): Partial<LightstepNodeSDKConfiguration> {
  return Object.assign({}, DEFAULTS, config, configFromEnvironment());
}

function configFromEnvironment(): { [key: string]: any } {
  return Object.entries(OPTION_ALIAS_MAP).reduce((acc, [envName, optName]) => {
    const value = process.env[envName];
    if (value) acc[optName] = value;
    return acc;
  }, {} as { [key: string]: any });
}

function defaultFailureHandler(logger: Logger) {
  return (message: string) => {
    logger.error(message);
    throw new LightstepConfigurationError(message);
  };
}

function validateConfiguration(config: Partial<LightstepNodeSDKConfiguration>) {
  validateLicenseKey(config);
  validateServiceName(config);
}

function validateLicenseKey(config: Partial<LightstepNodeSDKConfiguration>) {
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

function validateServiceName(config: Partial<LightstepNodeSDKConfiguration>) {
  if (!config.serviceName)
    fail(
      'Invalid configuration: service name missing. Set LS_SERVICE_NAME env var or configure serviceName in code'
    );
}

function configureTraceExporter(
  config: Partial<LightstepNodeSDKConfiguration>
) {
  if (config.traceExporter) return;

  config.traceExporter = new CollectorTraceExporter({
    protocolNode: CollectorProtocolNode.HTTP_JSON,
    serviceName: config.serviceName,
    url: config.spanEndpoint,
    headers: {
      'lightstep-access-token': config.token,
    },
  });
}
