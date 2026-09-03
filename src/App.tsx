import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  Image as ImageIcon,
  Lock,
  LockOpen,
  RefreshCcw,
  RotateCcw,
  RotateCw,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from "lucide-react";

type OutputFormat = "image/webp" | "image/jpeg" | "image/png";

type SourceImage = {
  file: File;
  image: HTMLImageElement;
  url: string;
  width: number;
  height: number;
};

const formatLabels: Record<OutputFormat, string> = {
  "image/webp": "WEBP",
  "image/jpeg": "JPG",
  "image/png": "PNG",
};

const extensions: Record<OutputFormat, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function outputName(name: string, format: OutputFormat) {
  const base = name.replace(/\.[^/.]+$/, "") || "image";
  return `${base}-imagefitlab.${extensions[format]}`;
}

export default function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const outputUrlRef = useRef<string | null>(null);
  const [source, setSource] = useState<SourceImage | null>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [lockRatio, setLockRatio] = useState(true);
  const [quality, setQuality] = useState(82);
  const [format, setFormat] = useState<OutputFormat>("image/webp");
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputSize, setOutputSize] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState("");

  const notify = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2400);
  };

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setNotice("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setNotice("That image is over the 30 MB limit.");
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setSource((current) => {
        if (current) URL.revokeObjectURL(current.url);
        return { file, image, url, width: image.naturalWidth, height: image.naturalHeight };
      });
      setWidth(image.naturalWidth);
      setHeight(image.naturalHeight);
      setQuality(82);
      setFormat("image/webp");
      setBrightness(100);
      setContrast(100);
      setRotation(0);
      setFlipX(false);
      setNotice("Image ready to edit.");
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setNotice("This image could not be opened.");
    };
    image.src = url;
  }, []);

  useEffect(() => {
    if (!source || width < 1 || height < 1) return;
    let cancelled = false;

    const timeout = window.setTimeout(() => {
      setRendering(true);
      const quarterTurn = Math.abs(rotation % 180) === 90;
      const canvas = document.createElement("canvas");
      canvas.width = quarterTurn ? height : width;
      canvas.height = quarterTurn ? width : height;
      const context = canvas.getContext("2d");
      if (!context) return setRendering(false);

      if (format === "image/jpeg") {
        context.fillStyle = "#fff";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }

      context.save();
      context.translate(canvas.width / 2, canvas.height / 2);
      context.rotate((rotation * Math.PI) / 180);
      context.scale(flipX ? -1 : 1, 1);
      context.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
      context.drawImage(source.image, -width / 2, -height / 2, width, height);
      context.restore();

      canvas.toBlob(
        (blob) => {
          if (!blob || cancelled) return setRendering(false);
          if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
          const nextUrl = URL.createObjectURL(blob);
          outputUrlRef.current = nextUrl;
          setOutputUrl(nextUrl);
          setOutputSize(blob.size);
          setRendering(false);
        },
        format,
        format === "image/png" ? undefined : quality / 100,
      );
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [brightness, contrast, flipX, format, height, quality, rotation, source, width]);

  useEffect(() => () => {
    if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
  }, []);

  const pickImage = () => inputRef.current?.click();

  const setNewWidth = (value: string) => {
    const next = Math.max(1, Math.min(12000, Number(value) || 1));
    setWidth(next);
    if (source && lockRatio) setHeight(Math.max(1, Math.round(next / (source.width / source.height))));
  };

  const setNewHeight = (value: string) => {
    const next = Math.max(1, Math.min(12000, Number(value) || 1));
    setHeight(next);
    if (source && lockRatio) setWidth(Math.max(1, Math.round(next * (source.width / source.height))));
  };

  const reset = () => {
    if (!source) return;
    setWidth(source.width);
    setHeight(source.height);
    setQuality(82);
    setFormat("image/webp");
    setBrightness(100);
    setContrast(100);
    setRotation(0);
    setFlipX(false);
    notify("Adjustments reset.");
  };

  const download = () => {
    if (!source || !outputUrl) return;
    const anchor = document.createElement("a");
    anchor.href = outputUrl;
    anchor.download = outputName(source.file.name, format);
    anchor.click();
    notify("Image downloaded.");
  };

  const outputWidth = Math.abs(rotation % 180) === 90 ? height : width;
  const outputHeight = Math.abs(rotation % 180) === 90 ? width : height;
  const reduction = source && outputSize ? Math.round((1 - outputSize / source.file.size) * 100) : 0;

  return (
    <main>
      {notice && <div className="notice" role="status">{notice}</div>}
      <header className="topbar">
        <div className="brand">
          <span className="logo"><Sparkles size={20} /></span>
          <span><strong>ImageFitLab</strong><small>Image studio, minus the upload</small></span>
        </div>
        <span className="privacy"><ShieldCheck size={17} /> 100% on-device</span>
      </header>

      {!source ? (
        <section className="landing">
          <div className="intro">
            <span className="eyebrow">Free browser tool</span>
            <h1>Make every image <em>fit.</em></h1>
            <p>Resize, compress, convert, rotate, and fine-tune your images without sending them to a server.</p>
            <div className="chips"><span>WebP, JPG & PNG</span><span>Up to 30 MB</span><span>No account</span></div>
          </div>
          <div
            className={`dropzone ${dragging ? "dragging" : ""}`}
            role="button"
            tabIndex={0}
            aria-label="Upload an image"
            onClick={pickImage}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") pickImage(); }}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const file = event.dataTransfer.files[0];
              if (file) processFile(file);
            }}
          >
            <span className="upload-icon"><UploadCloud size={42} /></span>
            <h2>Drop an image here</h2>
            <p>or click to choose one</p>
            <button className="primary">Choose image</button>
          </div>
          <FileInput inputRef={inputRef} onFile={processFile} />
        </section>
      ) : (
        <section className="workspace">
          <div className="filebar">
            <div><strong>{source.file.name}</strong><small>{source.width} × {source.height}px · {formatBytes(source.file.size)}</small></div>
            <button className="button secondary" onClick={pickImage}><ImageIcon size={17} /> New image</button>
            <FileInput inputRef={inputRef} onFile={processFile} />
          </div>

          <div className="editor-grid">
            <aside className="panel controls">
              <div className="panel-title"><strong>Adjustments</strong><button onClick={reset}><RefreshCcw size={14} /> Reset</button></div>
              <div className="control-body">
                <section>
                  <div className="section-heading"><h3>Size</h3><button className="ratio" onClick={() => setLockRatio(!lockRatio)}>{lockRatio ? <Lock size={14} /> : <LockOpen size={14} />}{lockRatio ? "Ratio locked" : "Ratio free"}</button></div>
                  <div className="dimensions">
                    <label>WIDTH<input type="number" min="1" max="12000" value={width} onChange={(e) => setNewWidth(e.target.value)} /></label>
                    <label>HEIGHT<input type="number" min="1" max="12000" value={height} onChange={(e) => setNewHeight(e.target.value)} /></label>
                  </div>
                </section>
                <section>
                  <h3>Transform</h3>
                  <div className="transform-row">
                    <button aria-label="Rotate left" onClick={() => setRotation((rotation + 270) % 360)}><RotateCcw size={18} /></button>
                    <button aria-label="Rotate right" onClick={() => setRotation((rotation + 90) % 360)}><RotateCw size={18} /></button>
                    <button className={flipX ? "active" : ""} onClick={() => setFlipX(!flipX)}>FLIP</button>
                  </div>
                </section>
                <section className="sliders">
                  <Range label="Brightness" value={brightness} min={25} max={175} onChange={setBrightness} />
                  <Range label="Contrast" value={contrast} min={25} max={175} onChange={setContrast} />
                </section>
                <section>
                  <label className="format-label">Format
                    <select value={format} onChange={(e) => setFormat(e.target.value as OutputFormat)}>
                      <option value="image/webp">WebP — smallest</option>
                      <option value="image/jpeg">JPG — universal</option>
                      <option value="image/png">PNG — lossless</option>
                    </select>
                  </label>
                  <Range label="Quality" value={quality} min={10} max={100} onChange={setQuality} disabled={format === "image/png"} />
                </section>
              </div>
            </aside>

            <div className="stage-column">
              <div className="stage">
                <Preview label="Original" src={source.url} meta={`${source.width} × ${source.height}`} />
                <Preview label={rendering ? "Rendering…" : "Optimized"} src={outputUrl ?? source.url} meta={`${outputWidth} × ${outputHeight}`} accent />
              </div>
              <div className="exportbar panel">
                <div className="stats">
                  <Stat label="Output" value={outputSize ? formatBytes(outputSize) : "—"} />
                  <Stat label="Saved" value={outputSize ? `${reduction}%` : "—"} positive={reduction > 0} />
                  <Stat label="Format" value={formatLabels[format]} />
                </div>
                <button className="download" onClick={download} disabled={!outputUrl || rendering}><Download size={20} /> Download {formatLabels[format]}</button>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function FileInput({ inputRef, onFile }: { inputRef: React.RefObject<HTMLInputElement | null>; onFile: (file: File) => void }) {
  return <input ref={inputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
    const file = event.target.files?.[0];
    if (file) onFile(file);
    event.target.value = "";
  }} />;
}

function Range({ label, value, min, max, onChange, disabled = false }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void; disabled?: boolean }) {
  return <label className={`range ${disabled ? "disabled" : ""}`}><span>{label}<output>{value}%</output></span><input type="range" min={min} max={max} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} /></label>;
}

function Preview({ label, src, meta, accent = false }: { label: string; src: string; meta: string; accent?: boolean }) {
  return <figure className="preview"><figcaption className={accent ? "accent" : ""}><strong>{label}</strong><span>{meta}</span></figcaption><div className="checker"><img src={src} alt={`${label} preview`} /></div></figure>;
}

function Stat({ label, value, positive = false }: { label: string; value: string; positive?: boolean }) {
  return <div className="stat"><small>{label}</small><strong className={positive ? "positive" : ""}>{value}</strong></div>;
}
