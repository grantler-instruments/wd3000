export function drawMediaPipePreviewFrame(
  canvasCtx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  image: CanvasImageSource,
) {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
  canvasCtx.filter = "grayscale(100%)";
  canvasCtx.translate(canvas.width, 0);
  canvasCtx.scale(-1, 1);
  canvasCtx.drawImage(image, 0, 0, canvas.width, canvas.height);
  canvasCtx.filter = "none";
  canvasCtx.fillStyle = "rgba(0, 0, 0, 0.5)";
  canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
  canvasCtx.globalCompositeOperation = "screen";
}

export function finishMediaPipePreviewFrame(canvasCtx: CanvasRenderingContext2D) {
  canvasCtx.restore();
}
