"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const src_1 = require("../src");
const sdk_node_1 = require("@opentelemetry/sdk-node");
const api_1 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
const resources_1 = require("@opentelemetry/resources");
describe('Lightstep OpenTelemetry Launcher Node', () => {
    describe('configureSDK', () => {
        const accessToken = 'x'.repeat(32);
        const serviceName = 'test-service';
        const minimalConfig = { accessToken, serviceName };
        beforeEach(() => {
            Object.keys(process.env).forEach(k => delete process.env[k]);
            api_1.trace.disable();
            api_1.metrics.disable();
            api_1.context.disable();
            api_1.propagation.disable();
        });
        describe('minimal configuration', () => {
            it('should require access token and serviceName', () => {
                const sdk = src_1.lightstep.configureOpenTelemetry({
                    accessToken,
                    serviceName,
                });
                assert.ok(sdk instanceof sdk_node_1.NodeSDK);
            });
        });
        describe('service name', () => {
            it('is required', () => {
                assert.throws(() => src_1.lightstep.configureOpenTelemetry({ accessToken }), err => {
                    assert(err instanceof src_1.LightstepConfigurationError);
                    assert.match(err.message, /^Invalid configuration: service name missing/);
                    return true;
                });
            });
            it('should be settable by environment', () => {
                process.env.LS_SERVICE_NAME = 'test-service';
                const sdk = src_1.lightstep.configureOpenTelemetry({ accessToken });
                assert.ok(sdk instanceof sdk_node_1.NodeSDK);
            });
            it('is added to the resource', async () => {
                const sdk = src_1.lightstep.configureOpenTelemetry({
                    accessToken,
                    serviceName,
                });
                assert.ok(sdk instanceof sdk_node_1.NodeSDK);
                await sdk.start();
                assert.strictEqual(api_1.trace.getTracerProvider().resource.labels[resources_1.SERVICE_RESOURCE.NAME], serviceName);
            });
        });
        describe('access token', () => {
            it('is required for prod', () => {
                assert.throws(() => src_1.lightstep.configureOpenTelemetry({ serviceName }), err => {
                    assert(err instanceof src_1.LightstepConfigurationError);
                    assert.match(err.message, /^Invalid configuration: access token missing/);
                    return true;
                });
            });
            it('is not required for custom sat', () => {
                const sdk = src_1.lightstep.configureOpenTelemetry({
                    serviceName,
                    spanEndpoint: 'http://localhost:8360',
                });
                assert.ok(sdk instanceof sdk_node_1.NodeSDK);
            });
            it('should be settable by environment', () => {
                process.env.LS_ACCESS_TOKEN = accessToken;
                const sdk = src_1.lightstep.configureOpenTelemetry({ serviceName });
                assert.ok(sdk instanceof sdk_node_1.NodeSDK);
            });
        });
        describe('service version', async () => {
            it('is added to the resource', async () => {
                const serviceVersion = '0.0.1';
                const sdk = src_1.lightstep.configureOpenTelemetry({
                    accessToken,
                    serviceName,
                    serviceVersion,
                });
                assert.ok(sdk instanceof sdk_node_1.NodeSDK);
                await sdk.start();
                assert.strictEqual(api_1.trace.getTracerProvider().resource.labels[resources_1.SERVICE_RESOURCE.VERSION], serviceVersion);
            });
        });
        describe('propagation', () => {
            it('defaults to b3', async () => {
                const sdk = src_1.lightstep.configureOpenTelemetry(minimalConfig);
                await sdk.start();
                assert.ok(api_1.propagation['_getGlobalPropagator']() instanceof core_1.B3Propagator);
            });
            it('can be assigned using a comma delimited string', async () => {
                const sdk = src_1.lightstep.configureOpenTelemetry({
                    accessToken,
                    serviceName,
                    propagators: 'b3,tracecontext',
                });
                await sdk.start();
                const propagator = api_1.propagation['_getGlobalPropagator']();
                assert.ok(propagator instanceof core_1.CompositePropagator);
                const [b3, tc] = propagator['_propagators'];
                assert.ok(b3 instanceof core_1.B3Propagator);
                assert.ok(tc instanceof core_1.HttpTraceContext);
            });
            it('can be assigned using a comma delimited string from environment', async () => {
                process.env.OTEL_PROPAGATORS = 'b3,tracecontext';
                const sdk = src_1.lightstep.configureOpenTelemetry(minimalConfig);
                await sdk.start();
                const propagator = api_1.propagation['_getGlobalPropagator']();
                assert.ok(propagator instanceof core_1.CompositePropagator);
                const [b3, tc] = propagator['_propagators'];
                assert.ok(b3 instanceof core_1.B3Propagator);
                assert.ok(tc instanceof core_1.HttpTraceContext);
            });
            it('raises exception for unknown propagator string', async () => {
                // eslint-disable-next-line
                await assert.rejects(async () => {
                    const sdk = src_1.lightstep.configureOpenTelemetry({
                        accessToken,
                        serviceName,
                        propagators: 'b3,foo',
                    });
                    await sdk.start();
                }, err => {
                    assert(err instanceof src_1.LightstepConfigurationError);
                    assert.match(err.message, /^Invalid configuration: unknown propagator specified: foo/);
                    return true;
                });
            });
            it('does not override user provided propagator', async () => {
                const propagator = new core_1.HttpTraceContext();
                const sdk = src_1.lightstep.configureOpenTelemetry(Object.assign(Object.assign({}, minimalConfig), { httpTextPropagator: propagator }));
                await sdk.start();
                assert.deepEqual(api_1.propagation['_getGlobalPropagator'](), propagator);
            });
        });
    });
});
//# sourceMappingURL=lightstep-opentelemetry-launcher-node.test.js.map