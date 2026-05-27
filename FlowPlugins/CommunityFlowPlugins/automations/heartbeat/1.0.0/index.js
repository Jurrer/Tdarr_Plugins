"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.plugin = exports.details = void 0;
/* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */
var heartbeatInterval = null;
var heartbeatUrl = '';
var details = function () { return ({
    name: 'Heartbeat Liveness Probe',
    description: 'Sends periodic HTTP GET requests while the worker is active. '
        + 'Starts when the first file hits this plugin and continues in the background '
        + 'until the worker process exits. Passes files through without modification.',
    style: {
        borderColor: '#E91E63',
    },
    tags: 'automations,heartbeat,liveness,probe,keepalive',
    isStartPlugin: false,
    pType: '',
    requiresVersion: '2.11.01',
    sidebarPosition: -1,
    icon: 'faHeartbeat',
    inputs: [
        {
            label: 'Heartbeat URL',
            name: 'heartbeatUrl',
            type: 'string',
            defaultValue: 'http://example.com/heartbeat',
            inputUI: {
                type: 'text',
            },
            tooltip: 'URL to send GET requests to as heartbeat',
        },
        {
            label: 'Heartbeat Interval (seconds)',
            name: 'heartbeatInterval',
            type: 'number',
            defaultValue: '30',
            inputUI: {
                type: 'text',
            },
            tooltip: 'How often to send heartbeat GET requests',
        },
        {
            label: 'Request Headers (JSON)',
            name: 'requestHeaders',
            type: 'string',
            defaultValue: '{}',
            inputUI: {
                type: 'textarea',
                style: {
                    height: '100px',
                },
            },
            tooltip: 'Optional JSON headers to include in heartbeat requests',
        },
    ],
    outputs: [
        {
            number: 1,
            tooltip: 'Heartbeat active - continue flow',
        },
    ],
}); };
exports.details = details;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
var plugin = function (args) { return __awaiter(void 0, void 0, void 0, function () {
    var lib, heartbeatIntervalSecs, requestHeaders, sendHeartbeat;
    var _this = this;
    return __generator(this, function (_a) {
        lib = require('../../../../../methods/lib')();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-param-reassign
        args.inputs = lib.loadDefaultValues(args.inputs, details);
        if (!heartbeatInterval) {
            heartbeatUrl = String(args.inputs.heartbeatUrl);
            heartbeatIntervalSecs = Math.max(5, Number(args.inputs.heartbeatInterval) || 30) * 1000;
            requestHeaders = JSON.parse(String(args.inputs.requestHeaders) || '{}');
            sendHeartbeat = function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    args.deps.axios.get(heartbeatUrl, {
                        headers: requestHeaders,
                        timeout: 10000,
                    }).catch(function () {
                        // heartbeat errors are expected if receiver is briefly unavailable
                    });
                    return [2 /*return*/];
                });
            }); };
            sendHeartbeat();
            heartbeatInterval = setInterval(sendHeartbeat, heartbeatIntervalSecs);
            heartbeatInterval.unref();
            args.jobLog("Heartbeat started - sending to ".concat(heartbeatUrl, " every ").concat(heartbeatIntervalSecs / 1000, "s"));
        }
        return [2 /*return*/, {
                outputFileObj: args.inputFileObj,
                outputNumber: 1,
                variables: args.variables,
            }];
    });
}); };
exports.plugin = plugin;
