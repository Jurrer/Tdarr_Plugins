import { plugin } from
  '../../../../../../FlowPluginsTs/CommunityFlowPlugins/tools/compressSubtitles/1.0.0/index';
import { IpluginInputArgs } from '../../../../../../FlowPluginsTs/FlowHelpers/1.0.0/interfaces/interfaces';
import { IFileObject } from '../../../../../../FlowPluginsTs/FlowHelpers/1.0.0/interfaces/synced/IFileObject';

const sampleH265 = require('../../../../../sampleData/media/sampleH265_1.json');

const pgsStream = {
  index: 2,
  codec_name: 'hdmv_pgs_subtitle',
  codec_type: 'subtitle',
};

const vobsubStream = {
  index: 2,
  codec_name: 'dvd_subtitle',
  codec_type: 'subtitle',
};

const srtStream = {
  index: 2,
  codec_name: 'subrip',
  codec_type: 'subtitle',
};

const identifyJson = (ids: number[]): string => JSON.stringify({
  tracks: ids.map((id) => ({
    id,
    type: 'subtitles',
    properties: {
      codec_id: 'S_HDMV/PGS',
    },
  })),
});

// Mock the CLI class
jest.mock('../../../../../../FlowPluginsTs/FlowHelpers/1.0.0/cliUtils', () => ({
  CLI: jest.fn().mockImplementation(() => ({
    runCli: jest.fn().mockResolvedValue({
      cliExitCode: 0,
      errorLogFull: ['{}'],
    }),
  })),
}));

// Mock the lib methods
jest.mock('../../../../../../methods/lib', () => () => ({
  loadDefaultValues: jest.fn((inputs) => inputs),
}));

describe('compressSubtitles Plugin', () => {
  let baseArgs: IpluginInputArgs;
  let mockRunCli: jest.Mock;
  let mockCancelled: boolean;

  beforeEach(() => {
    jest.clearAllMocks();

    const { CLI } = require('../../../../../../FlowPluginsTs/FlowHelpers/1.0.0/cliUtils');
    const mockCLI = CLI as jest.MockedClass<typeof CLI>;
    mockRunCli = jest.fn().mockResolvedValue({ cliExitCode: 0, errorLogFull: ['{}'] });
    mockCancelled = false;
    mockCLI.mockImplementation(() => ({
      runCli: mockRunCli,
      get cancelled() { return mockCancelled; },
    }));

    const inputFileObj = JSON.parse(JSON.stringify(sampleH265)) as IFileObject;
    inputFileObj.container = 'mkv';

    baseArgs = {
      inputs: {},
      variables: {} as IpluginInputArgs['variables'],
      inputFileObj,
      jobLog: jest.fn(),
      logFullCliOutput: false,
      updateWorker: jest.fn(),
      workDir: '/tmp/workDir',
      deps: {
        fsextra: {
          ensureDirSync: jest.fn(),
        },
      },
    } as unknown as IpluginInputArgs;
  });

  describe('No-op cases', () => {
    it('should pass through unchanged when there are no subtitle streams', async () => {
      const result = await plugin(baseArgs);

      expect(result.outputNumber).toBe(1);
      expect(result.outputFileObj).toBe(baseArgs.inputFileObj);
      expect(result.variables).toBe(baseArgs.variables);
      expect(mockRunCli).not.toHaveBeenCalled();
    });

    it('should pass through unchanged for text-only subtitle streams', async () => {
      baseArgs.inputFileObj.ffProbeData.streams?.push(srtStream);

      const result = await plugin(baseArgs);

      expect(result.outputNumber).toBe(1);
      expect(result.outputFileObj).toBe(baseArgs.inputFileObj);
      expect(mockRunCli).not.toHaveBeenCalled();
    });

    it('should pass through unchanged for a non-mkv container', async () => {
      baseArgs.inputFileObj.container = 'mp4';
      baseArgs.inputFileObj.ffProbeData.streams?.push(pgsStream);

      const result = await plugin(baseArgs);

      expect(result.outputNumber).toBe(1);
      expect(result.outputFileObj).toBe(baseArgs.inputFileObj);
      expect(mockRunCli).not.toHaveBeenCalled();
    });

    it('should pass through unchanged when ffProbeData.streams is missing', async () => {
      baseArgs.inputFileObj.ffProbeData.streams = undefined;

      const result = await plugin(baseArgs);

      expect(result.outputNumber).toBe(1);
      expect(result.outputFileObj).toBe(baseArgs.inputFileObj);
      expect(mockRunCli).not.toHaveBeenCalled();
    });

    it('should pass through unchanged when mkvmerge identify finds no matching tracks', async () => {
      baseArgs.inputFileObj.ffProbeData.streams?.push(pgsStream);
      mockRunCli.mockResolvedValueOnce({ cliExitCode: 0, errorLogFull: ['{}'] });

      const result = await plugin(baseArgs);

      expect(result.outputNumber).toBe(1);
      expect(result.outputFileObj).toBe(baseArgs.inputFileObj);
      expect(mockRunCli).toHaveBeenCalledTimes(1);
    });
  });

  describe('Successful execution', () => {
    it('should recompress PGS subtitles with mkvmerge', async () => {
      baseArgs.inputFileObj.ffProbeData.streams?.push(pgsStream);
      mockRunCli
        .mockResolvedValueOnce({ cliExitCode: 0, errorLogFull: [identifyJson([2])] })
        .mockResolvedValueOnce({ cliExitCode: 0, errorLogFull: [] });

      const result = await plugin(baseArgs);

      expect(result.outputNumber).toBe(1);
      expect(result.outputFileObj).not.toBe(baseArgs.inputFileObj);
      expect(result.outputFileObj._id).toMatch(/\.mkv$/);
      expect(result.variables).toBe(baseArgs.variables);
      expect(mockRunCli).toHaveBeenCalledTimes(2);
    });

    it('should recompress VobSub subtitles', async () => {
      baseArgs.inputFileObj.ffProbeData.streams?.push(vobsubStream);
      mockRunCli
        .mockResolvedValueOnce({ cliExitCode: 0, errorLogFull: [identifyJson([2])] })
        .mockResolvedValueOnce({ cliExitCode: 0, errorLogFull: [] });

      const result = await plugin(baseArgs);

      expect(result.outputNumber).toBe(1);
      expect(mockRunCli).toHaveBeenCalledTimes(2);
    });

    it('should pass one --compression argument per identified track', async () => {
      baseArgs.inputFileObj.ffProbeData.streams?.push(pgsStream);
      mockRunCli
        .mockResolvedValueOnce({ cliExitCode: 0, errorLogFull: [identifyJson([2, 3])] })
        .mockResolvedValueOnce({ cliExitCode: 0, errorLogFull: [] });

      const { CLI } = require('../../../../../../FlowPluginsTs/FlowHelpers/1.0.0/cliUtils');

      await plugin(baseArgs);

      expect(CLI).toHaveBeenLastCalledWith(
        expect.objectContaining({
          cli: 'mkvmerge',
          spawnArgs: expect.arrayContaining([
            '--compression', '2:zlib',
            '--compression', '3:zlib',
            baseArgs.inputFileObj._id,
          ]),
        }),
      );
    });

    it('should use a custom CLI path when configured', async () => {
      baseArgs.inputs.useCustomCliPath = true;
      baseArgs.inputs.customCliPath = '/custom/path/mkvmerge';
      baseArgs.inputFileObj.ffProbeData.streams?.push(pgsStream);
      mockRunCli
        .mockResolvedValueOnce({ cliExitCode: 0, errorLogFull: [identifyJson([2])] })
        .mockResolvedValueOnce({ cliExitCode: 0, errorLogFull: [] });

      const { CLI } = require('../../../../../../FlowPluginsTs/FlowHelpers/1.0.0/cliUtils');

      await plugin(baseArgs);

      expect(CLI).toHaveBeenCalledWith(
        expect.objectContaining({ cli: '/custom/path/mkvmerge' }),
      );
    });
  });

  describe('Error handling', () => {
    it('should continue when mkvmerge completes with warnings', async () => {
      baseArgs.inputFileObj.ffProbeData.streams?.push(pgsStream);
      mockRunCli
        .mockResolvedValueOnce({ cliExitCode: 0, errorLogFull: [identifyJson([2])] })
        .mockResolvedValueOnce({ cliExitCode: 1, errorLogFull: [] });

      const result = await plugin(baseArgs);

      expect(result.outputNumber).toBe(1);
      expect(baseArgs.jobLog).toHaveBeenCalledWith('mkvmerge completed with warnings');
    });

    it('should throw when mkvmerge exits with an error', async () => {
      baseArgs.inputFileObj.ffProbeData.streams?.push(pgsStream);
      mockRunCli
        .mockResolvedValueOnce({ cliExitCode: 0, errorLogFull: [identifyJson([2])] })
        .mockResolvedValueOnce({ cliExitCode: 2, errorLogFull: [] });

      await expect(plugin(baseArgs)).rejects.toThrow('Running mkvmerge failed');
    });

    it('should throw on cancellation surfaced as exit code 1', async () => {
      baseArgs.inputFileObj.ffProbeData.streams?.push(pgsStream);
      mockCancelled = true;
      mockRunCli
        .mockResolvedValueOnce({ cliExitCode: 0, errorLogFull: [identifyJson([2])] })
        .mockResolvedValueOnce({ cliExitCode: 1, errorLogFull: [] });

      await expect(plugin(baseArgs)).rejects.toThrow('Running mkvmerge failed');
    });

    it('should throw when the mkvmerge identify step fails', async () => {
      baseArgs.inputFileObj.ffProbeData.streams?.push(pgsStream);
      mockRunCli.mockResolvedValueOnce({ cliExitCode: 2, errorLogFull: [] });

      await expect(plugin(baseArgs)).rejects.toThrow('Running mkvmerge identify failed');
      expect(mockRunCli).toHaveBeenCalledTimes(1);
    });

    it('should throw when the mkvmerge identify output is not valid JSON', async () => {
      baseArgs.inputFileObj.ffProbeData.streams?.push(pgsStream);
      mockRunCli.mockResolvedValueOnce({ cliExitCode: 0, errorLogFull: ['not json'] });

      await expect(plugin(baseArgs)).rejects.toThrow('Failed to parse mkvmerge identify output');
    });
  });
});
