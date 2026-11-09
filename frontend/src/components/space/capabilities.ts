import { prefersReducedMotion } from "@/lib/utils";

/** Software rasterisers: WebGL "works" but every frame runs on the CPU. */
const SOFTWARE_GL = /swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/i;

function rendererName(gl: WebGL2RenderingContext): string {
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  return info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
}

/**
 * WebGL2 on a real GPU, more than 4 cores, no reduced motion, no data saver; otherwise the static
 * planet (DESIGN.md §Fallbacks). `?static-planet` forces static; `?force-3d` forces 3D (screenshot
 * capture on CI machines that only have a software renderer).
 */
export function canRender3D(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.has("static-planet")) return false;
  const forced = params.has("force-3d");
  if (prefersReducedMotion() && !forced) return false;
  if (forced) return true;
  if ((navigator.hardwareConcurrency ?? 8) <= 4) return false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return false;
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return false;
    const software = SOFTWARE_GL.test(rendererName(gl));
    gl.getExtension("WEBGL_lose_context")?.loseContext(); // free the probe context
    return !software;
  } catch {
    return false;
  }
}
