"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LightstepConfigurationError = exports.LS_OPTION_ALIAS_MAP = void 0;
/** Mapping of environment variable names to LightstepNodeSDKConfiguration names */
var LS_OPTION_ALIAS_MAP;
(function (LS_OPTION_ALIAS_MAP) {
    LS_OPTION_ALIAS_MAP["LS_ACCESS_TOKEN"] = "accessToken";
    LS_OPTION_ALIAS_MAP["LS_SERVICE_NAME"] = "serviceName";
    LS_OPTION_ALIAS_MAP["LS_SERVICE_VERSION"] = "serviceVersion";
    LS_OPTION_ALIAS_MAP["OTEL_EXPORTER_OTLP_SPAN_ENDPOINT"] = "spanEndpoint";
    LS_OPTION_ALIAS_MAP["OTEL_EXPORTER_OTLP_METRIC_ENDPOINT"] = "metricEndpoint";
    LS_OPTION_ALIAS_MAP["OTEL_PROPAGATORS"] = "propagators";
})(LS_OPTION_ALIAS_MAP = exports.LS_OPTION_ALIAS_MAP || (exports.LS_OPTION_ALIAS_MAP = {}));
/** Lightstep configuration error */
class LightstepConfigurationError extends Error {
}
exports.LightstepConfigurationError = LightstepConfigurationError;
//# sourceMappingURL=types.js.map