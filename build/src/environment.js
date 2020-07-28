"use strict";
// export type ENVIRONMENT_MAP = { [key: string]: string | number };
// /**
//  * Environment interface to define all names
//  */
// export interface LS_ENVIRONMENT {
//   OTEL_LOG_LEVEL?: LogLevel;
// }
// const ENVIRONMENT_NUMBERS: Partial<keyof ENVIRONMENT>[] = ['OTEL_LOG_LEVEL'];
// /**
//  * Default environment variables
//  */
// export const DEFAULT_ENVIRONMENT: LS_ENVIRONMENT = {
//   OTEL_NO_PATCH_MODULES: '',
//   OTEL_LOG_LEVEL: LogLevel.ERROR,
//   OTEL_SAMPLING_PROBABILITY: 1,
// };
// /**
//  * Parses a variable as number with number validation
//  * @param name
//  * @param environment
//  * @param values
//  * @param min
//  * @param max
//  */
// function parseNumber(
//   name: keyof LS_ENVIRONMENT,
//   environment: ENVIRONMENT_MAP | LS_ENVIRONMENT,
//   values: ENVIRONMENT_MAP,
//   min = -Infinity,
//   max = Infinity
// ) {
//   if (typeof values[name] !== 'undefined') {
//     const value = Number(values[name] as string);
//     if (!isNaN(value) && value >= min && value <= max) {
//       environment[name] = value;
//     }
//   }
// }
// /**
//  * Parses environment values
//  * @param values
//  */
// export function parseEnvironment(values: ENVIRONMENT_MAP): ENVIRONMENT {
//   const environment: ENVIRONMENT_MAP = {};
//   for (const env in DEFAULT_ENVIRONMENT) {
//     const key = env as keyof LS_ENVIRONMENT;
//     switch (key) {
//       case 'OTEL_LOG_LEVEL':
//         parseNumber(key, environment, values, LogLevel.ERROR, LogLevel.DEBUG);
//         break;
//       default:
//         if (ENVIRONMENT_NUMBERS.indexOf(key) >= 0) {
//           parseNumber(key, environment, values);
//         } else {
//           if (typeof values[key] !== 'undefined') {
//             environment[key] = values[key];
//           }
//         }
//     }
//   }
//   return environment;
// }
//# sourceMappingURL=environment.js.map