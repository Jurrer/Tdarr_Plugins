import { plugin, details } from
  '../../../../../../FlowPluginsTs/CommunityFlowPlugins/automations/preventSleepWhileEncoding/1.0.0/index';
import { IpluginInputArgs } from '../../../../../../FlowPluginsTs/FlowHelpers/1.0.0/interfaces/interfaces';
import getConfigVars from '../../../../configVars';

const sampleH264 = require('../../../../../sampleData/media/sampleH264_1.json');

const mockExecSync = jest.fn();
const mockSpawn = jest.fn().mockReturnValue({ kill: jest.fn() });
const mockExec = jest.fn();

jest.mock('child_process', () => ({
  execSync: (...a: unknown[]) => mockExecSync(...a),
  spawn: (...a: unknown[]) => mockSpawn(...a),
  exec: (...a: unknown[]) => mockExec(...a),
}));

const flush = () => new Promise<void>((r) => { setImmediate(r); });

describe('preventSleepWhileEncoding Plugin', () => {
  let baseArgs: IpluginInputArgs;
  let mockAxiosGet: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
    mockAxiosGet = jest.fn();
    mockExecSync.mockReset();
    mockSpawn.mockReset().mockReturnValue({ kill: jest.fn() });
    mockExec.mockReset();

    baseArgs = {
      inputs: {
        pollIntervalSeconds: '10',
      },
      variables: {} as IpluginInputArgs['variables'],
      inputFileObj: JSON.parse(JSON.stringify(sampleH264)),
      jobLog: jest.fn(),
      updateWorker: jest.fn(),
      platform: 'linux',
      configVars: getConfigVars(),
      job: { jobId: 'my-job-1' },
      deps: {
        axios: {
          get: mockAxiosGet,
        },
        configVars: getConfigVars(),
      },
    } as unknown as IpluginInputArgs;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should export details with correct structure', () => {
    const d = details();
    expect(d.name).toBe('Prevent Sleep While Encoding');
    expect(d.inputs.length).toBe(1);
    expect(d.outputs.length).toBe(2);
    expect(d.outputs[0].number).toBe(1);
    expect(d.outputs[1].number).toBe(2);
    expect(d.tags).toContain('automations');
  });

  it('should return output 2 on first call with no workers (needs 3 confirmations)', async () => {
    mockAxiosGet.mockResolvedValue({
      data: {
        123: {
          workers: {
            w1: { job: { jobId: 'my-job-1' }, file: 'something.mkv' },
          },
        },
      },
    });

    const pluginPromise = plugin(baseArgs);
    jest.advanceTimersByTime(10000);
    await flush();

    const result = await pluginPromise;
    expect(result.outputNumber).toBe(2);
    expect(result.variables.confirmedCount).toBe(1);
  });

  it('should return output 1 on third call with no workers (3 confirmations)', async () => {
    mockAxiosGet.mockResolvedValue({
      data: {
        123: {
          workers: {
            w1: { job: { jobId: 'my-job-1' }, file: 'something.mkv' },
          },
        },
      },
    });

    baseArgs.variables = { confirmedCount: 2 };

    const pluginPromise = plugin(baseArgs);
    jest.advanceTimersByTime(10000);
    await flush();

    const result = await pluginPromise;
    expect(result.outputNumber).toBe(1);
    expect(result.variables.confirmedCount).toBe(0);
  });

  it('should return output 2 when other workers are running', async () => {
    mockAxiosGet.mockResolvedValue({
      data: {
        123: {
          workers: {
            w1: { job: { jobId: 'my-job-1' }, file: 'something.mkv' },
            w2: { job: { jobId: 'other-job' }, file: 'real.mkv' },
          },
        },
      },
    });

    const pluginPromise = plugin(baseArgs);
    jest.advanceTimersByTime(10000);
    await flush();

    const result = await pluginPromise;
    expect(result.outputNumber).toBe(2);
    expect(result.variables.confirmedCount).toBe(0);
  });

  it('should reset confirmedCount when workers appear', async () => {
    let callCount = 0;
    mockAxiosGet.mockImplementation(() => {
      callCount += 1;
      return Promise.resolve({
        data: {
          123: {
            workers: {
              w1: { job: { jobId: 'my-job-1' }, file: 'something.mkv' },
            },
          },
        },
      });
    });

    baseArgs.variables = { confirmedCount: 2 };

    const pluginPromise = plugin(baseArgs);
    jest.advanceTimersByTime(10000);
    await flush();

    const result = await pluginPromise;
    expect(result.outputNumber).toBe(2);
    expect(result.variables.confirmedCount).toBe(0);
  });

  it('should skip automation workers when counting', async () => {
    mockAxiosGet.mockResolvedValue({
      data: {
        123: {
          workers: {
            w1: { job: { jobId: 'my-job-1' }, file: 'something.mkv' },
            w2: { job: { jobId: 'auto-job' }, file: '/.tdarr/automation-cfg1-run1.txt' },
          },
        },
      },
    });

    baseArgs.variables = { confirmedCount: 2 };

    const pluginPromise = plugin(baseArgs);
    jest.advanceTimersByTime(10000);
    await flush();

    const result = await pluginPromise;
    expect(result.outputNumber).toBe(1);
    expect(result.variables.confirmedCount).toBe(0);
  });

  it('should reset confirmedCount on error and return output 2', async () => {
    mockAxiosGet.mockRejectedValue(new Error('Network error'));

    baseArgs.variables = { confirmedCount: 2 };

    const pluginPromise = plugin(baseArgs);
    jest.advanceTimersByTime(10000);
    await flush();

    const result = await pluginPromise;
    expect(result.outputNumber).toBe(2);
    expect(result.variables.confirmedCount).toBe(0);
  });

  describe('Sleep Prevention', () => {
    it('should start systemd-inhibit on linux', async () => {
      mockAxiosGet.mockResolvedValue({
        data: { 123: { workers: { w1: { job: { jobId: 'my-job-1' } } } } },
      });

      const pluginPromise = plugin(baseArgs);
      jest.advanceTimersByTime(10000);
      await flush();

      await pluginPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'systemd-inhibit',
        expect.arrayContaining(['--what=idle:sleep']),
        expect.any(Object),
      );
    });

    it('should use SetThreadExecutionState on win32', async () => {
      baseArgs.platform = 'win32';

      mockAxiosGet.mockResolvedValue({
        data: { 123: { workers: { w1: { job: { jobId: 'my-job-1' } } } } },
      });

      const pluginPromise = plugin(baseArgs);
      jest.advanceTimersByTime(10000);
      await flush();

      await pluginPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'powershell',
        expect.arrayContaining([expect.stringContaining('SetThreadExecutionState')]),
        expect.any(Object),
      );
    });

    it('should use caffeinate on darwin', async () => {
      baseArgs.platform = 'darwin';

      mockAxiosGet.mockResolvedValue({
        data: { 123: { workers: { w1: { job: { jobId: 'my-job-1' } } } } },
      });

      const mockKill = jest.fn();
      mockSpawn.mockReturnValue({ kill: mockKill });

      const pluginPromise = plugin(baseArgs);
      jest.advanceTimersByTime(10000);
      await flush();

      await pluginPromise;

      expect(mockSpawn).toHaveBeenCalledWith('caffeinate', ['-i'], expect.any(Object));
    });
  });
});
