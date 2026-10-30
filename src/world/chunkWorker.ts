import { buildChunkGreedyMesh, MesherInput } from './GreedyMesher';

self.onmessage = (e: MessageEvent<MesherInput>) => {
  const out = buildChunkGreedyMesh(e.data);
  (self as unknown as Worker).postMessage(out, [
    out.positions.buffer,
    out.normals.buffer,
    out.colors.buffer,
    out.indices.buffer,
    out.emissivePositions.buffer,
  ]);
};
