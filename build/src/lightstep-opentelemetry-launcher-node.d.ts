import { NodeSDK } from '@opentelemetry/sdk-node';
import * as types from './types';
/**
 * Returns a NodeSDK object configured using Lightstep defaults with user
 * overrides. Call start on the returned NodeSDK instance to apply the
 * configuration and start the export pipeline.
 * @param config
 */
export declare function configureOpenTelemetry(config?: Partial<types.LightstepNodeSDKConfiguration>): NodeSDK;
//# sourceMappingURL=lightstep-opentelemetry-launcher-node.d.ts.map