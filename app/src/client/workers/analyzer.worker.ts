import { analyze } from '../../shared/analyzer-core';

type AnalyzerWorkerRequest = Readonly<{
  requestId: number;
  data: ArrayBuffer;
  width: number;
  height: number;
}>;

self.onmessage = (event: MessageEvent<AnalyzerWorkerRequest>): void => {
  const { requestId, data, width, height } = event.data;
  const result = analyze({
    data: new Uint8ClampedArray(data),
    width,
    height,
  });
  self.postMessage({ requestId, result });
};
