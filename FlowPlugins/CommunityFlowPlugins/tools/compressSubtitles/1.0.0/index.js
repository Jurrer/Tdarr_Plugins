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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.plugin = exports.details = void 0;
var cliUtils_1 = require("../../../../FlowHelpers/1.0.0/cliUtils");
var fileUtils_1 = require("../../../../FlowHelpers/1.0.0/fileUtils");
// Image-based subtitle codecs that Blu-ray/DVD remuxes commonly ship zlib-compressed.
// FFmpeg's matroska muxer can't write compressed tracks, so a `-c copy` pass silently
// decompresses them (often 2-3x larger). This plugin re-muxes with mkvmerge to put the
// compression back, at no quality cost.
var imageSubtitleCodecs = ['hdmv_pgs_subtitle', 'dvd_subtitle'];
var details = function () { return ({
    name: 'Compress Subtitles',
    description: 'Recompress image-based subtitle tracks (PGS/VobSub) with mkvmerge so they '
        + 'keep the small, zlib-compressed size they typically arrive at. FFmpeg\'s matroska '
        + 'muxer cannot write compressed tracks, so any `-c copy` pass silently decompresses '
        + 'them, which can inflate a file by hundreds of MB for no benefit. Does nothing if the '
        + 'file has no image-based subtitle tracks.',
    style: {
        borderColor: 'green',
    },
    tags: '',
    isStartPlugin: false,
    pType: '',
    requiresVersion: '2.11.01',
    sidebarPosition: -1,
    icon: '',
    inputs: [
        {
            label: 'Use Custom CLI Path?',
            name: 'useCustomCliPath',
            type: 'boolean',
            defaultValue: 'false',
            inputUI: {
                type: 'switch',
            },
            tooltip: 'Specify whether to use a custom path to mkvmerge instead of relying on PATH.',
        },
        {
            label: 'Custom CLI Path',
            name: 'customCliPath',
            type: 'string',
            defaultValue: '/usr/bin/mkvmerge',
            inputUI: {
                type: 'text',
                displayConditions: {
                    logic: 'AND',
                    sets: [
                        {
                            logic: 'AND',
                            inputs: [
                                {
                                    name: 'useCustomCliPath',
                                    value: 'true',
                                    condition: '===',
                                },
                            ],
                        },
                    ],
                },
            },
            tooltip: 'Specify the path to mkvmerge.',
        },
    ],
    outputs: [
        {
            number: 1,
            tooltip: 'Continue to next plugin',
        },
    ],
}); };
exports.details = details;
var hasImageBasedSubtitles = function (streams) { return streams.some(function (stream) { return stream.codec_type === 'subtitle'
    && imageSubtitleCodecs.includes(String(stream.codec_name)); }); };
// eslint-disable-next-line @typescript-eslint/no-unused-vars
var plugin = function (args) { return __awaiter(void 0, void 0, void 0, function () {
    var lib, passthrough, isMkv, streams, _a, useCustomCliPath, customCliPath, cliPath, identifyCli, identifyRes, identify, tids, outputFilePath, spawnArgs, cli, res;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                lib = require('../../../../../methods/lib')();
                // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-param-reassign
                args.inputs = lib.loadDefaultValues(args.inputs, details);
                passthrough = function () { return ({
                    outputFileObj: args.inputFileObj,
                    outputNumber: 1,
                    variables: args.variables,
                }); };
                isMkv = String(args.inputFileObj.container).toLowerCase() === 'mkv';
                streams = (_c = (_b = args === null || args === void 0 ? void 0 : args.inputFileObj) === null || _b === void 0 ? void 0 : _b.ffProbeData) === null || _c === void 0 ? void 0 : _c.streams;
                if (!isMkv || !Array.isArray(streams) || !hasImageBasedSubtitles(streams)) {
                    args.jobLog('No image-based subtitle tracks to compress. Skipping.');
                    return [2 /*return*/, passthrough()];
                }
                _a = args.inputs, useCustomCliPath = _a.useCustomCliPath, customCliPath = _a.customCliPath;
                cliPath = useCustomCliPath ? String(customCliPath) : 'mkvmerge';
                identifyCli = new cliUtils_1.CLI({
                    cli: cliPath,
                    spawnArgs: ['-J', args.inputFileObj._id],
                    spawnOpts: {},
                    jobLog: args.jobLog,
                    outputFilePath: '',
                    inputFileObj: args.inputFileObj,
                    logFullCliOutput: args.logFullCliOutput,
                    updateWorker: args.updateWorker,
                    args: args,
                });
                return [4 /*yield*/, identifyCli.runCli()];
            case 1:
                identifyRes = _d.sent();
                if (identifyRes.cliExitCode !== 0 && identifyRes.cliExitCode !== 1) {
                    args.jobLog('Running mkvmerge identify failed');
                    throw new Error('Running mkvmerge identify failed');
                }
                identify = {};
                try {
                    identify = JSON.parse(identifyRes.errorLogFull.join(''));
                }
                catch (err) {
                    args.jobLog('Failed to parse mkvmerge identify output');
                    throw new Error('Failed to parse mkvmerge identify output');
                }
                tids = (identify.tracks || [])
                    .filter(function (track) {
                    var _a;
                    return track.type === 'subtitles'
                        && /^(S_HDMV\/PGS|S_VOBSUB)/.test(String((_a = track.properties) === null || _a === void 0 ? void 0 : _a.codec_id));
                })
                    .map(function (track) { return track.id; });
                if (tids.length === 0) {
                    args.jobLog('mkvmerge identify found no image-based subtitle tracks. Skipping.');
                    return [2 /*return*/, passthrough()];
                }
                outputFilePath = "".concat((0, fileUtils_1.getPluginWorkDir)(args), "/").concat((0, fileUtils_1.getFileName)(args.inputFileObj._id), ".mkv");
                spawnArgs = __spreadArray(__spreadArray([
                    '-o', outputFilePath
                ], tids.flatMap(function (tid) { return ['--compression', "".concat(tid, ":zlib")]; }), true), [
                    args.inputFileObj._id,
                ], false);
                cli = new cliUtils_1.CLI({
                    cli: cliPath,
                    spawnArgs: spawnArgs,
                    spawnOpts: {},
                    jobLog: args.jobLog,
                    outputFilePath: outputFilePath,
                    inputFileObj: args.inputFileObj,
                    logFullCliOutput: args.logFullCliOutput,
                    updateWorker: args.updateWorker,
                    args: args,
                });
                return [4 /*yield*/, cli.runCli()];
            case 2:
                res = _d.sent();
                if (res.cliExitCode === 1 && !cli.cancelled) {
                    args.jobLog('mkvmerge completed with warnings');
                }
                else if (res.cliExitCode !== 0) {
                    args.jobLog('Running mkvmerge failed');
                    throw new Error('Running mkvmerge failed');
                }
                return [2 /*return*/, {
                        outputFileObj: {
                            _id: outputFilePath,
                        },
                        outputNumber: 1,
                        variables: args.variables,
                    }];
        }
    });
}); };
exports.plugin = plugin;
