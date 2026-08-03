// Client-only: turns the rendered contract HTML into a paginated A4 PDF blob.
// Runs in the browser because the Worker runtime has no canvas/native rendering.

export async function contractHtmlToPdfBlob(node: HTMLElement): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(node, {
    scale: Math.min(2, window.devicePixelRatio || 1.5),
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });

  const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgHeight = (canvas.height * pageWidth) / canvas.width;

  const image = canvas.toDataURL("image/jpeg", 0.92);
  let remaining = imgHeight;
  let offset = 0;
  pdf.addImage(image, "JPEG", 0, 0, pageWidth, imgHeight);
  remaining -= pageHeight;
  while (remaining > 0) {
    offset -= pageHeight;
    pdf.addPage();
    pdf.addImage(image, "JPEG", 0, offset, pageWidth, imgHeight);
    remaining -= pageHeight;
  }

  return pdf.output("blob");
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(",");
  const mime = /:(.*?);/.exec(head ?? "")?.[1] ?? "image/png";
  const binary = atob(body ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
