import { CLI } from '../../../../FlowHelpers/1.0.0/cliUtils';
import { getFileName, getPluginWorkDir } from '../../../../FlowHelpers/1.0.0/fileUtils';
import {
  IpluginDetails,
  IpluginInputArgs,
  IpluginOutputArgs,
} from '../../../../FlowHelpers/1.0.0/interfaces/interfaces';

// Image-based subtitle codecs that Blu-ray/DVD remuxes commonly ship zlib-compressed.
// FFmpeg's matroska muxer can't write compressed tracks, so a `-c copy` pass silently
// decompresses them (often 2-3x larger). This plugin re-muxes with mkvmerge to put the
// compression back, at no quality cost.
const imageSubtitleCodecs = ['hdmv_pgs_subtitle', 'dvd_subtitle'];

const details = (): IpluginDetails => ({
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
});

interface ImkvmergeTrack {
  id: number,
  type: string,
  properties?: {
    codec_id?: string,
  },
}

interface ImkvmergeIdentify {
  tracks?: ImkvmergeTrack[],
}

const hasImageBasedSubtitles = (streams: Array<Record<string, unknown>>): boolean => streams.some(
  (stream) => stream.codec_type === 'subtitle'
    && imageSubtitleCodecs.includes(String(stream.codec_name)),
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const plugin = async (args: IpluginInputArgs): Promise<IpluginOutputArgs> => {
  const lib = require('../../../../../methods/lib')();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-param-reassign
  args.inputs = lib.loadDefaultValues(args.inputs, details);

  const passthrough = (): IpluginOutputArgs => ({
    outputFileObj: args.inputFileObj,
    outputNumber: 1,
    variables: args.variables,
  });

  const isMkv = String(args.inputFileObj.container).toLowerCase() === 'mkv';
  const streams = args?.inputFileObj?.ffProbeData?.streams;

  if (!isMkv || !Array.isArray(streams) || !hasImageBasedSubtitles(streams)) {
    args.jobLog('No image-based subtitle tracks to compress. Skipping.');
    return passthrough();
  }

  const { useCustomCliPath, customCliPath } = args.inputs;
  const cliPath = useCustomCliPath ? String(customCliPath) : 'mkvmerge';

  const identifyCli = new CLI({
    cli: cliPath,
    spawnArgs: ['-J', args.inputFileObj._id],
    spawnOpts: {},
    jobLog: args.jobLog,
    outputFilePath: '',
    inputFileObj: args.inputFileObj,
    logFullCliOutput: args.logFullCliOutput,
    updateWorker: args.updateWorker,
    args,
  });

  const identifyRes = await identifyCli.runCli();

  if (identifyRes.cliExitCode !== 0 && identifyRes.cliExitCode !== 1) {
    args.jobLog('Running mkvmerge identify failed');
    throw new Error('Running mkvmerge identify failed');
  }

  let identify: ImkvmergeIdentify = {};
  try {
    identify = JSON.parse(identifyRes.errorLogFull.join(''));
  } catch (err) {
    args.jobLog('Failed to parse mkvmerge identify output');
    throw new Error('Failed to parse mkvmerge identify output');
  }

  const tids = (identify.tracks || [])
    .filter((track) => track.type === 'subtitles'
      && /^(S_HDMV\/PGS|S_VOBSUB)/.test(String(track.properties?.codec_id)))
    .map((track) => track.id);

  if (tids.length === 0) {
    args.jobLog('mkvmerge identify found no image-based subtitle tracks. Skipping.');
    return passthrough();
  }

  const outputFilePath = `${getPluginWorkDir(args)}/${getFileName(args.inputFileObj._id)}.mkv`;

  const spawnArgs = [
    '-o', outputFilePath,
    ...tids.flatMap((tid) => ['--compression', `${tid}:zlib`]),
    args.inputFileObj._id,
  ];

  const cli = new CLI({
    cli: cliPath,
    spawnArgs,
    spawnOpts: {},
    jobLog: args.jobLog,
    outputFilePath,
    inputFileObj: args.inputFileObj,
    logFullCliOutput: args.logFullCliOutput,
    updateWorker: args.updateWorker,
    args,
  });

  const res = await cli.runCli();

  if (res.cliExitCode === 1 && !cli.cancelled) {
    args.jobLog('mkvmerge completed with warnings');
  } else if (res.cliExitCode !== 0) {
    args.jobLog('Running mkvmerge failed');
    throw new Error('Running mkvmerge failed');
  }

  return {
    outputFileObj: {
      _id: outputFilePath,
    },
    outputNumber: 1,
    variables: args.variables,
  };
};
export {
  details,
  plugin,
};
