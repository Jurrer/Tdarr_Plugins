const details = () => ({
  id: 'Jurrer_AudioToOpus',
  Stage: 'Pre-processing',
  Name: 'Jurrer Audio To Opus',
  Type: 'Audio',
  Operation: 'Transcode',
  Description: 'This plugin transcodes audio-only files (music libraries) to Opus, which offers '
    + 'the best size/quality ratio of any lossy codec at typical music bitrates. Files that '
    + 'contain a real video stream are ignored; embedded cover art is dropped since Ogg/Opus '
    + "can't carry an image stream, but all other tags/metadata are preserved. Streams already "
    + 'in Opus are copied, not re-encoded. If every audio stream is already Opus but the file is '
    + "in some other container (e.g. opus-in-mka), it's remuxed into a .opus container without "
    + 're-encoding.\n\n',
  Version: '1.00',
  Tags: 'pre-processing,ffmpeg,audio only,configurable',
  Inputs: [
    {
      name: 'bitrate',
      type: 'string',
      defaultValue: '',
      inputUI: {
        type: 'text',
      },
      tooltip: `Specify the target audio bitrate, e.g. 128k. Leave empty to let libopus pick its
                own (variable) bitrate automatically.
                    \\nExample:\\n
                    128k

                    \\nExample:\\n
                    96k

                    \\nExample:\\n
                    (leave empty)`,
    },
  ],
});

// Accepts '128', '128k' or '128K'; returns null for anything else (including empty string),
// so the caller can tell "not set" apart from "set but unusable".
const normaliseBitrate = (bitrate) => {
  const match = /^(\d+)k?$/i.exec((bitrate || '').trim());
  return match ? `${match[1]}k` : null;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const plugin = (file, librarySettings, inputs, otherArguments) => {
  const lib = require('../methods/lib')();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-param-reassign
  inputs = lib.loadDefaultValues(inputs, details);

  const response = {
    processFile: false,
    preset: '',
    container: '.opus',
    handBrakeMode: false,
    FFmpegMode: true,
    reQueueAfter: true,
    infoLog: '',
  };

  // Ignore files that contain a real video stream. Embedded cover art also shows up as a
  // "video" stream (mjpeg/png), so it's distinguished by having no frame rate.
  const hasRealVideo = file.ffProbeData.streams
    .filter((stream) => stream.codec_type === 'video' && stream.avg_frame_rate !== '0/0').length > 0;
  if (hasRealVideo) {
    response.infoLog += '☒File contains video!\n';
    return response;
  }

  const audioStreams = file.ffProbeData.streams.filter((stream) => stream.codec_type === 'audio');
  if (audioStreams.length === 0) {
    response.infoLog += '☒File contains no audio streams.\n';
    return response;
  }

  let bitrate = null;
  if (inputs.bitrate !== '') {
    bitrate = normaliseBitrate(inputs.bitrate);
    if (bitrate === null) {
      response.infoLog += `☒Could not parse bitrate "${inputs.bitrate}", letting libopus pick automatically.\n`;
    }
  }

  let codecArgs = '';
  let needsConvert = false;
  for (let idx = 0; idx < audioStreams.length; idx += 1) {
    if (audioStreams[idx].codec_name === 'opus') {
      codecArgs += `-c:a:${idx} copy `;
    } else {
      codecArgs += `-c:a:${idx} libopus `;
      if (bitrate !== null) {
        codecArgs += `-b:a:${idx} ${bitrate} `;
      }
      needsConvert = true;
    }
  }

  // Even when every stream is already opus, the file may be wrapped in a non-opus
  // container (e.g. opus-in-mka, opus-in-ogg with a .ogg extension). Remux those into
  // a .opus container - no re-encoding needed since codecArgs is all "copy" already.
  const needsContainerNormalise = (file.container || '').toLowerCase() !== 'opus';
  if (!needsConvert && !needsContainerNormalise) {
    response.infoLog += '☑File is already opus.\n';
    return response;
  }

  response.processFile = true;
  response.preset = `<io> -vn -map 0:a ${codecArgs}-map_metadata 0 -f opus`;
  if (needsConvert) {
    response.infoLog += `☒Converting non-opus audio track(s) to opus${bitrate !== null ? ` at ${bitrate}` : ''}.\n`;
  } else {
    response.infoLog += `☒Audio is already opus but container is .${file.container}. Remuxing to .opus.\n`;
  }

  return response;
};

module.exports.details = details;
module.exports.plugin = plugin;
