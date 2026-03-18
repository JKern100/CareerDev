import html2canvas from "html2canvas";

export async function generateShareImage(): Promise<Blob> {
  const el = document.getElementById("share-card");
  if (!el) throw new Error("Share card element not found");

  const canvas = await html2canvas(el, {
    scale: 1, // card is already at 1080px
    useCORS: true,
    backgroundColor: null,
    logging: false,
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to generate image"))),
      "image/png"
    );
  });
}

export async function downloadShareImage(filename = "careerdev-results.png") {
  const blob = await generateShareImage();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function shareToInstagram() {
  const blob = await generateShareImage();
  const file = new File([blob], "careerdev-results.png", { type: "image/png" });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: "My CareerDev Results",
      text: "Check out my top career matches on CareerDev!",
    });
    return true;
  }

  // Fallback: download the image
  downloadShareImage();
  return false;
}

export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
