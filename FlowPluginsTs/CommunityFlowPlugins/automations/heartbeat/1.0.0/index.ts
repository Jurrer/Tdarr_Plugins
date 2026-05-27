import {
  IpluginDetails,
  IpluginInputArgs,
  IpluginOutputArgs,
} from '../../../../FlowHelpers/1.0.0/interfaces/interfaces';

/* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */

let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let heartbeatUrl = '';

const details = (): IpluginDetails => ({
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
});

const plugin = async (args: IpluginInputArgs): Promise<IpluginOutputArgs> => {
  const lib = require('../../../../../methods/lib')();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-param-reassign
  args.inputs = lib.loadDefaultValues(args.inputs, details);

  if (!heartbeatInterval) {
    heartbeatUrl = String(args.inputs.heartbeatUrl);
    const heartbeatIntervalSecs = Math.max(5, Number(args.inputs.heartbeatInterval) || 30) * 1000;
    const requestHeaders = JSON.parse(String(args.inputs.requestHeaders) || '{}');

    const sendHeartbeat = () => {
      args.deps.axios.get(heartbeatUrl, {
        headers: requestHeaders,
        timeout: 10000,
      }).catch(() => {
        // heartbeat errors are expected if receiver is briefly unavailable
      });
    };

    sendHeartbeat();
    heartbeatInterval = setInterval(sendHeartbeat, heartbeatIntervalSecs);
    heartbeatInterval.unref();
    args.jobLog(`Heartbeat started - sending to ${heartbeatUrl} every ${heartbeatIntervalSecs / 1000}s`);
  }

  return {
    outputFileObj: args.inputFileObj,
    outputNumber: 1,
    variables: args.variables,
  };
};

export {
  details,
  plugin,
};
