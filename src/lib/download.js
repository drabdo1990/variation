/**
 * Hand the browser a file to save.
 *
 * One path for every export in the app — JSON bundles and CSV tables alike —
 * so the object-URL lifetime is handled in exactly one place.
 */
export function downloadBlob(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export const downloadJson = (filename, data) =>
  downloadBlob(filename, JSON.stringify(data, null, 2), "application/json");

export const downloadCsv = (filename, text) =>
  downloadBlob(filename, text, "text/csv;charset=utf-8");
