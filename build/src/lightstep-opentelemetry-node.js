"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureOpenTelemetry = void 0;
const core_1 = require("@opentelemetry/core");
const sdk_node_1 = require("@opentelemetry/sdk-node");
const types = require("./types");
const exporter_collector_1 = require("@opentelemetry/exporter-collector");
const resources_1 = require("@opentelemetry/resources");
const PROPAGATION_FORMATS = {
    B3: 'b3',
    TRACECONTEXT: 'tracecontext',
    CORRELATIONCONTEXT: 'correlationcontext',
};
/** Map of propagation format to class implementing the format */
const PROPAGATOR_LOOKUP_MAP = {
    b3: core_1.B3Propagator,
    tracecontext: core_1.HttpTraceContext,
    correlationcontext: core_1.HttpCorrelationContext,
};
/** Default values for LightstepNodeSDKConfiguration */
const LS_DEFAULTS = {
    spanEndpoint: 'https://ingest.lightstep.com:443/api/v2/otel/trace',
    metricEndpoint: 'https://ingest.lightstep.com:443/metrics',
    propagators: PROPAGATION_FORMATS.B3,
};
const ACCESS_TOKEN_HEADER = 'Lightstep-Access-Token';
let logger;
let fail;
/**
 * Returns a NodeSDK object configured using Lightstep defaults with user
 * overrides. Call start on the returned NodeSDK instance to apply the
 * configuration and start the export pipeline.
 * @param config
 */
function configureOpenTelemetry(config = {}) {
    logger = setupLogger(config);
    fail = config.failureHandler || defaultFailureHandler(logger);
    config = coalesceConfig(config);
    validateConfiguration(config);
    configureBaseResource(config);
    configurePropagation(config);
    configureTraceExporter(config);
    return new sdk_node_1.NodeSDK(config);
}
exports.configureOpenTelemetry = configureOpenTelemetry;
/**
 * Setup up logger to use for LOCL. This may or may not be the logger configured
 * for OpenTelemetry. This is so we can print meaningful error messages when
 * configuration fails.
 */
function setupLogger(config) {
    var _a, _b;
    if (config.logger)
        return config.logger;
    let logLevel = (_a = config.logLevel) !== null && _a !== void 0 ? _a : core_1.LogLevel.INFO;
    if (process.env.OTEL_LOG_LEVEL) {
        logLevel = (_b = core_1.LogLevel[process.env.OTEL_LOG_LEVEL.toUpperCase()]) !== null && _b !== void 0 ? _b : logLevel;
    }
    const logger = new core_1.ConsoleLogger(logLevel);
    if (logLevel == core_1.LogLevel.DEBUG && !config.logger) {
        config.logger = logger;
    }
    return logger;
}
/**
 * Merges configuration with the following precedence: code config, config from
 * environment, default configuration. Returns a new configuration.
 * @param config
 */
function coalesceConfig(config) {
    const envConfig = configFromEnvironment();
    const mergedConfig = Object.assign(Object.assign(Object.assign({}, LS_DEFAULTS), envConfig), config);
    logConfig(LS_DEFAULTS, envConfig, config, mergedConfig);
    return mergedConfig;
}
function logConfig(defaults, envConfig, lsConfig, mergedConfig) {
    logger.debug('Merged Config', mergedConfig);
    logger.debug('Config from code: ', lsConfig);
    logger.debug('Config from environment', envConfig);
    logger.debug('Default config: ', defaults);
}
/**
 * Iterates through known environment variable keys and returns an object with
 * keys using lightstep conventions
 */
function configFromEnvironment() {
    const env = process.env;
    return Object.entries(types.LS_OPTION_ALIAS_MAP).reduce((acc, [envName, optName]) => {
        const value = env[envName];
        if (value && optName)
            acc[optName] = value;
        return acc;
    }, {});
}
/**
 * The default failure handler. It logs a message at error level and raises
 * an exception. Can be overridden by passing a custom failureHandler in
 * LightstepNodeSDKConfiguration
 * @param logger
 */
function defaultFailureHandler(logger) {
    return (message) => {
        logger.error(message);
        throw new types.LightstepConfigurationError(message);
    };
}
/**
 * Makes upfront validations on configuration issues known to cause failures.
 * @param config
 */
function validateConfiguration(config) {
    validateToken(config);
    validateServiceName(config);
}
/**
 * Validates that a token is present if the spanEndpoint is for LS SaaS.
 * The token might be optional for other spanEndpoints, but will depend on their
 * configuration. If a token is provided, we validate its length.
 * @param config
 */
function validateToken(config) {
    if (!config.accessToken && config.spanEndpoint === LS_DEFAULTS.spanEndpoint) {
        fail(`Invalid configuration: access token missing, must be set when reporting to ${config.spanEndpoint}. Set LS_ACCESS_TOKEN env var or configure token in code`);
    }
    if (!config.accessToken)
        return;
    if (![32, 84, 104].includes(config.accessToken.length)) {
        fail(`Invalid configuration: access token length incorrect. Ensure token is set correctly`);
    }
}
/**
 * Validates that the service name is present
 * @param config
 */
function validateServiceName(config) {
    if (!config.serviceName)
        fail('Invalid configuration: service name missing. Set LS_SERVICE_NAME env var or configure serviceName in code');
}
function configureBaseResource(config) {
    const labels = {
        [resources_1.SERVICE_RESOURCE.NAME]: config.serviceName,
    };
    if (config.serviceVersion)
        labels[resources_1.SERVICE_RESOURCE.VERSION] = config.serviceVersion;
    const baseResource = new resources_1.Resource(labels);
    if (config.resource)
        config.resource = config.resource.merge(baseResource);
    else
        config.resource = baseResource;
}
/**
 * Configures export as JSON over HTTP to the configured spanEndpoint
 * @param config
 * @todo support more formats
 */
function configureTraceExporter(config) {
    if (config.traceExporter)
        return;
    const headers = {};
    if (config.accessToken)
        headers[ACCESS_TOKEN_HEADER] = config.accessToken;
    config.traceExporter = new exporter_collector_1.CollectorTraceExporter({
        protocolNode: exporter_collector_1.CollectorProtocolNode.HTTP_JSON,
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
function createPropagator(name) {
    const propagatorClass = PROPAGATOR_LOOKUP_MAP[name];
    if (!propagatorClass) {
        fail(`Invalid configuration: unknown propagator specified: ${name}. Supported propagators are: b3, tracecontext, correlationcontext`);
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
function configurePropagation(config) {
    var _a;
    if (config.httpTextPropagator)
        return;
    const propagators = (((_a = config.propagators) === null || _a === void 0 ? void 0 : _a.split(',')) || [PROPAGATION_FORMATS.B3]).map(name => createPropagator(name.trim()));
    if (propagators.length > 1) {
        config.httpTextPropagator = new core_1.CompositePropagator({ propagators });
    }
    else {
        config.httpTextPropagator = propagators[0];
    }
}
//# sourceMappingURL=lightstep-opentelemetry-node.js.map