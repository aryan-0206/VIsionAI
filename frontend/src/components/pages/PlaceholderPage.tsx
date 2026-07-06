import { useMemo, useState } from 'react';
import { CheckCircle2, Download, Film, Image, Loader2, Upload } from 'lucide-react';
import { useVisionStore } from '../../store/useVisionStore';
import { Card, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface PlaceholderPageProps {
  type: 'image' | 'video';
}

interface DetectionObject {
  label: string;
  confidence: number;
  bbox: [number, number, number, number];
}

interface DetectionResult {
  success: boolean;
  filename: string;
  output_url: string;
  download_url: string;
  objects: DetectionObject[];
  object_count: number;
  total_detections?: number;
  inference_time: number;
  resolution: string;
  model: string;
  device: string;
  timestamp: string;
}

export function PlaceholderPage({ type }: PlaceholderPageProps) {
  const { backendUrl, backendConnected } = useVisionStore();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [mediaUrl, setMediaUrl] = useState<string>('');

  const isImage = type === 'image';
  const title = isImage ? 'Image Detection' : 'Video Detection';
  const endpoint = `${backendUrl}/api/detect/${type}`;
  const acceptedTypes = useMemo(() => isImage ? 'image/*' : 'video/*', [isImage]);

  // Fetch output media through fetch() to bypass ngrok warning pages
  useEffect(() => {
    if (result && result.output_url) {
      const url = `${backendUrl}${result.output_url}`;
      fetch(url)
        .then((r) => r.blob())
        .then((blob) => setMediaUrl(URL.createObjectURL(blob)))
        .catch(() => setMediaUrl(url));
    }
  }, [result, backendUrl]);

  async function runDetection() {
    if (!file) return;

    setLoading(true);
    setError('');
    setResult(null);
    setMediaUrl('');

    try {
      const form = new FormData();
      form.append(type, file);

      const response = await fetch(endpoint, {
        method: 'POST',
        body: form,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Server error (HTTP ${response.status})`;
        try {
          const errorJson = JSON.parse(errorText) as { error?: string };
          if (errorJson.error) errorMessage = errorJson.error;
        } catch {
          if (errorText) errorMessage = errorText.slice(0, 100);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json() as DetectionResult;
      if (!data.success) {
        throw new Error(data.error || 'Detection failed.');
      }

      setResult(data);
      
      // Fetch the actual media file using our global fetch interceptor to bypass ngrok warning
      const outputUrl = `${backendUrl}${data.output_url}`;
      try {
        const mediaRes = await fetch(outputUrl);
        const blob = await mediaRes.blob();
        setMediaUrl(URL.createObjectURL(blob));
      } catch {
        setMediaUrl(outputUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Detection failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div className="flex items-center gap-3">
        <div className={[
          'flex h-9 w-9 items-center justify-center rounded-lg border',
          isImage ? 'border-emerald-500/30 bg-emerald-600/20' : 'border-blue-500/30 bg-blue-600/20',
        ].join(' ')}>
          {isImage
            ? <Image className="h-4 w-4 text-emerald-400" />
            : <Film className="h-4 w-4 text-blue-400" />}
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-100">{title}</h1>
          <p className="text-[11px] text-slate-400">
            Upload a {isImage ? 'photo' : 'video'} and run YOLOv8 detection through the Flask backend.
          </p>
        </div>
      </div>

      <Card glass>
        <CardBody className="space-y-5">
          <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-700 bg-slate-900/60 p-6 text-center transition hover:border-violet-500/60 hover:bg-slate-900">
            <input
              className="hidden"
              type="file"
              accept={acceptedTypes}
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setResult(null);
                setMediaUrl('');
                setError('');
              }}
            />
            <Upload className="h-7 w-7 text-slate-400" />
            <div>
              <p className="text-sm font-semibold text-slate-200">
                {file ? file.name : `Choose ${isImage ? 'an image' : 'a video'} file`}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Backend: <span className="font-mono text-slate-300">{backendUrl}</span>
              </p>
            </div>
            <Badge variant={backendConnected ? 'success' : 'warning'} dot pulse={backendConnected}>
              {backendConnected ? 'Backend connected' : 'Backend status unknown'}
            </Badge>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              disabled={!file || loading}
              onClick={() => void runDetection()}
              icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            >
              {loading ? 'Processing' : `Run ${title}`}
            </Button>

            {result?.download_url && (
              <Button
                variant="secondary"
                icon={<Download className="h-4 w-4" />}
                onClick={() => window.open(`${backendUrl}${result.download_url}`, '_blank')}
              >
                Download Output
              </Button>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {result && (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
                {isImage ? (
                  mediaUrl ? (
                    <img
                      src={mediaUrl}
                      alt="Detected output"
                      className="max-h-[520px] w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-64 items-center justify-center text-slate-500">Loading output...</div>
                  )
                ) : (
                  mediaUrl ? (
                    <video
                      src={mediaUrl}
                      className="max-h-[520px] w-full bg-black"
                      controls
                    />
                  ) : (
                    <div className="flex h-64 items-center justify-center text-slate-500">Loading output...</div>
                  )
                )}
              </div>

              <div className="space-y-3">
                <Card>
                  <CardBody className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Objects</span>
                      <span className="text-lg font-bold text-slate-100">
                        {result.total_detections ?? result.object_count}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Inference</span>
                      <span className="text-sm text-slate-200">{result.inference_time.toFixed(2)}s</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Resolution</span>
                      <span className="text-sm text-slate-200">{result.resolution}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Model</span>
                      <span className="text-sm text-slate-200">{result.model}</span>
                    </div>
                  </CardBody>
                </Card>

                <Card>
                  <CardBody className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Detections</p>
                    <div className="max-h-72 space-y-2 overflow-y-auto">
                      {result.objects.length === 0 ? (
                        <p className="text-sm text-slate-500">No objects detected.</p>
                      ) : (
                        result.objects.slice(0, 40).map((object, index) => (
                          <div key={`${object.label}-${index}`} className="flex items-center justify-between rounded-md bg-slate-900 px-3 py-2">
                            <span className="text-sm text-slate-200">{object.label}</span>
                            <span className="text-xs text-slate-400">{Math.round(object.confidence * 100)}%</span>
                          </div>
                        ))
                      )}
                    </div>
                  </CardBody>
                </Card>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
