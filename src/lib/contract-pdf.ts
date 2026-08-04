// Client-only: turns the rendered contract HTML into a paginated A4 PDF blob.
// Runs in the browser because the Worker runtime has no canvas/native rendering.

export async function contractHtmlToPdfBlob(node: HTMLElement): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  // html2canvas creates one continuous image and jsPDF slices it into pages.
  // Move the legal requisites block to the next page when it would cross a cut.
  const requisites = node.querySelector<HTMLElement>(".contract-requisites");
  if (requisites) {
    requisites.style.marginTop = "0px";
    const nodeRect = node.getBoundingClientRect();
    const blockRect = requisites.getBoundingClientRect();
    const sourcePageHeight = node.scrollWidth * (841.89 / 595.28);
    const blockTop = blockRect.top - nodeRect.top;
    const positionOnPage = blockTop % sourcePageHeight;
    if (positionOnPage + blockRect.height > sourcePageHeight) {
      requisites.style.marginTop = `${Math.ceil(sourcePageHeight - positionOnPage + 12)}px`;
    }
  }

  // The node may live in a sandboxed iframe document (isolated from the app's
  // oklch-based Tailwind tokens); size the capture from that document explicitly.
  const canvas = await html2canvas(node, {
    scale: Math.min(2, window.devicePixelRatio || 1.5),
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    width: node.scrollWidth,
    height: node.scrollHeight,
    windowWidth: node.scrollWidth,
    windowHeight: node.scrollHeight,
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
