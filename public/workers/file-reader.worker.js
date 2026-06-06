/**
 * Web Worker for reading large files without blocking the UI thread.
 * Receives a File reference, reads it incrementally, and posts progress back.
 */

self.onmessage = async function(e) {
  const { type, fileId, chunks } = e.data;

  if (type === 'merge-chunks') {
    try {
      // Merge multiple chunk ArrayBuffers into one
      const totalSize = chunks.reduce(function(sum, chunk) { return sum + chunk.byteLength; }, 0);
      const merged = new Uint8Array(totalSize);
      let offset = 0;

      for (var i = 0; i < chunks.length; i++) {
        merged.set(new Uint8Array(chunks[i]), offset);
        offset += chunks[i].byteLength;

        // Report progress
        self.postMessage({
          type: 'progress',
          fileId: fileId,
          progress: Math.round(((i + 1) / chunks.length) * 100)
        });
      }

      // Post the merged buffer back (transfer ownership for zero-copy)
      self.postMessage(
        { type: 'complete', fileId: fileId, buffer: merged.buffer, progress: 100 },
        [merged.buffer]
      );
    } catch (err) {
      self.postMessage({
        type: 'error',
        fileId: fileId,
        error: err.message || String(err)
      });
    }
  }
};
