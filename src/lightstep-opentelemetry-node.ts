import { ConsoleLogger, LogLevel } from '@opentelemetry/core';
import { Logger } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { LightstepNodeSDKConfiguration } from './types';
import {
  CollectorTraceExporter,
  CollectorProtocolNode,
} from '@opentelemetry/exporter-collector';

const DEFAULT_SATELLITE_URL =
  'https://ingest.lightstep.com:443/api/v2/otel/trace';

export function configureOpenTelemetry(
  config: Partial<LightstepNodeSDKConfiguration>
): NodeSDK {
  const logger: Logger =
    config.logger || new ConsoleLogger(config.logLevel || LogLevel.INFO);
  logger.debug('Starting up...');

  configureTraceExporter(config);
  return new NodeSDK(config);
}

function configureTraceExporter(
  config: Partial<LightstepNodeSDKConfiguration>
) {
  if (config.traceExporter) return;

  const url = config.satelliteUrl || DEFAULT_SATELLITE_URL;

  config.traceExporter = new CollectorTraceExporter({
    protocolNode: CollectorProtocolNode.HTTP_JSON,
    serviceName: config.serviceName,
    url,
    headers: {
      'lightstep-access-token': config.token,
    },
  });
}
