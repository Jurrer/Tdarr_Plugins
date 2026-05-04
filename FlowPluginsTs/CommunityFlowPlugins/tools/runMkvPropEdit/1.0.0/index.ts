import { CLI } from '../../../../FlowHelpers/1.0.0/cliUtils';
import {
  getContainer,
  getFileName,
  getPluginWorkDir,
} from '../../../../FlowHelpers/1.0.0/fileUtils';
import {
  IpluginDetails,
  IpluginInputArgs,
  IpluginOutputArgs,
} from '../../../../FlowHelpers/1.0.0/interfaces/interfaces';
import * as fs from 'fs/promises';

/* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */
const details = ():IpluginDetails => ({
  name: 'Run MKVPropEdit',
  description: 'Run MKVPropEdit on a file to update metadata which'
  + ' FFmpeg doesn\'t typically update such as stream bitrate.',
  style: {
    borderColor: 'green',
  },
  tags: '',
  isStartPlugin: false,
  pType: '',
  requiresVersion: '2.11.01',
  sidebarPosition: -1,
  icon: '',
  inputs: [],
  outputs: [
    {
      number: 1,
      tooltip: 'Continue to next plugin',
    },
  ],
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const plugin = async (args:IpluginInputArgs):Promise<IpluginOutputArgs> => {
  const lib = require('../../../../../methods/lib')();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-param-reassign
  args.inputs = lib.loadDefaultValues(args.inputs, details);

  const container = getContainer(args.inputFileObj._id);
  const tempFilePath = `${getPluginWorkDir(args)}/${getFileName(args.inputFileObj._id)}.${container}`;
  await fs.copyFile(args.inputFileObj._id, tempFilePath);

  const cliArgs = [
    '--add-track-statistics-tags',
    tempFilePath,
  ];

  const cli = new CLI({
    cli: args.mkvpropeditPath,
    spawnArgs: cliArgs,
    spawnOpts: {},
    jobLog: args.jobLog,
    outputFilePath: tempFilePath,
    inputFileObj: args.inputFileObj,
    logFullCliOutput: args.logFullCliOutput,
    updateWorker: args.updateWorker,
    args,
  });

  const res = await cli.runCli();

  if (res.cliExitCode !== 0) {
    args.jobLog('Running MKVPropEdit failed');
    throw new Error('Running MKVPropEdit failed');
  }

  return {
    outputFileObj: tempFilePath,
    outputNumber: 1,
    variables: args.variables,
  };
};
export {
  details,
  plugin,
};
