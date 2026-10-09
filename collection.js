'use strict';
// The editor opens directly from index.html; saving does not require a local server.
window.BasementCollection = {
  async choose(name) {
    if (typeof window.showSaveFilePicker !== 'function') return { download: true, name };
    const extension = name.split('.').pop().toLowerCase();
    const mime = { png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', webp:'image/webp', svg:'image/svg+xml', zip:'application/zip', endo:'application/json', json:'application/json' }[extension];
    try {
      return await window.showSaveFilePicker({
        id: 'endo-exports', suggestedName: name,
        ...(mime ? { types: [{ description: extension.toUpperCase(), accept: { [mime]: ['.' + extension] } }] } : {})
      });
    } catch (error) {
      if (error.name === 'AbortError') throw new DOMException('Exportación cancelada.', 'AbortError');
      throw error;
    }
  },
  async save(blob, name, handle) {
    const destination = handle || await this.choose(name);
    if (destination.download) {
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return { name };
    }
    const writable = await destination.createWritable();
    try { await writable.write(blob); await writable.close(); }
    catch (error) { try { await writable.abort(); } catch {} throw error; }
    return { name: destination.name };
  }
};
