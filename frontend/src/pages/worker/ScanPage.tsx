import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { scanService } from '../../services/api';
import { ScanResult } from '../../types/auth';
import { Camera, Upload, ArrowLeft, RefreshCw, AlertTriangle, UserCheck } from 'lucide-react';

export const ScanPage: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<{ title: string; subtext: string; isHuman?: boolean } | null>(null);

  const navigate = useNavigate();

  // Initialize camera using rear-facing camera preference
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    const startCamera = async () => {
      setCameraError(null);
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        activeStream = s;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      } catch (err: any) {
        console.error('Camera access error:', err);
        setCameraError('CAMERA ACCESS REQUIRED — Allow camera access to scan your dosimeter.');
      }
    };

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleCaptureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setAnalysisError(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `dosimeter_scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
          setCapturedFile(file);
          submitImageForAnalysis(file);
        }
      },
      'image/jpeg',
      0.92
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalysisError(null);
    setCapturedFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result as string);
      submitImageForAnalysis(file);
    };
    reader.readAsDataURL(file);
  };

  const submitImageForAnalysis = async (file: File) => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const result: ScanResult = await scanService.analyzeScan(file);
      navigate('/result', { state: { result } });
    } catch (err: any) {
      console.error('Scan analysis error:', err);
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === 'object') {
          setAnalysisError({
            title: detail.message || 'UNABLE TO READ DOSIMETER',
            subtext: detail.subtext || 'Please place the strip inside the scanning area and capture again.',
            isHuman: detail.status === 'HUMAN_DETECTED',
          });
        } else {
          setAnalysisError({
            title: 'UNABLE TO READ DOSIMETER',
            subtext: detail,
          });
        }
      } else {
        setAnalysisError({
          title: 'CONNECTION ERROR',
          subtext: 'Unable to connect to the SentriDose analysis server.',
        });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setCapturedFile(null);
    setAnalysisError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-4 sm:p-6 flex flex-col justify-between">
      <canvas ref={canvasRef} className="hidden" />

      <div className="max-w-md mx-auto w-full space-y-4">
        {/* Navigation Bar */}
        <div>
          <button
            onClick={() => navigate('/home')}
            className="inline-flex items-center space-x-2 text-xs font-bold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>SENTRIDOSE</span>
          </button>
        </div>

        {/* Page Header */}
        <div className="space-y-0.5 text-center">
          <h1 className="text-xl font-black tracking-wide text-white">SCAN DOSIMETER</h1>
        </div>

        {/* Rejection / Error Alert */}
        {analysisError && (
          <div className={`p-4 rounded-2xl border space-y-2 text-center animate-fade-in ${
            analysisError.isHuman ? 'bg-purple-950/80 border-purple-500/40 text-purple-200' : 'bg-amber-950/80 border-amber-500/40 text-amber-200'
          }`}>
            <div className="flex items-center justify-center space-x-2">
              {analysisError.isHuman ? <UserCheck className="w-5 h-5 text-purple-400" /> : <AlertTriangle className="w-5 h-5 text-amber-400" />}
              <span className="font-extrabold text-xs uppercase tracking-wider">{analysisError.title}</span>
            </div>
            <p className="text-[11px] font-medium text-slate-300">{analysisError.subtext}</p>
            <button
              onClick={handleRetake}
              className="mt-1.5 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl border border-slate-600 transition"
            >
              Try Again
            </button>
          </div>
        )}

          {/* Camera Container */}
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-3 sm:p-4 shadow-2xl space-y-4">
            <div className="relative aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden shadow-inner border border-slate-800">
              {!capturedImage ? (
                <>
                  {cameraError ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-3 z-10 bg-slate-950">
                      <AlertTriangle className="w-10 h-10 text-amber-500" />
                      <p className="text-xs font-bold text-slate-200">{cameraError}</p>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => window.location.reload()}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700"
                        >
                          RETRY CAMERA
                        </button>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow"
                        >
                          <Upload className="w-4 h-4" />
                          <span>UPLOAD FOR TESTING</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  )}

                  {/* Rectangular Framing Guide Overlay */}
                  {!cameraError && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                      <div className="w-56 h-56 sm:w-64 sm:h-64 border-2 border-dashed border-teal-400 rounded-2xl bg-teal-500/10 flex items-center justify-center shadow-[0_0_30px_rgba(20,184,166,0.3)]">
                        <span className="text-[11px] font-mono font-extrabold text-white bg-slate-950/90 px-3.5 py-1.5 rounded-full uppercase tracking-widest border border-teal-500/40">
                          PLACE DOSIMETER HERE
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <img src={capturedImage} alt="Captured Dosimeter" className="w-full h-full object-contain bg-slate-950" />
              )}

              {/* Processing Overlay */}
              {isAnalyzing && (
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-3 z-20">
                  <RefreshCw className="w-9 h-9 text-teal-400 animate-spin" />
                  <span className="text-xs font-mono font-bold tracking-widest uppercase text-teal-300">
                    Analyzing dosimeter...
                  </span>
                </div>
              )}
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleCaptureFrame}
                disabled={isAnalyzing || !!cameraError}
                className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-black py-3.5 px-6 rounded-xl shadow-lg transition disabled:opacity-50 text-sm flex items-center justify-center space-x-2"
              >
                <Camera className="w-5 h-5" />
                <span>{isAnalyzing ? 'ANALYZING...' : 'CAPTURE & ANALYZE (CAMERA)'}</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAnalyzing}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold py-3 px-4 rounded-xl text-xs border border-teal-500/40 transition flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
                >
                  <Upload className="w-4 h-4 text-teal-400" />
                  <span>{isAnalyzing ? 'ANALYZING...' : 'UPLOAD PHOTO (FOR TESTING)'}</span>
                </button>

                {capturedImage && (
                  <button
                    onClick={handleRetake}
                    disabled={isAnalyzing}
                    className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs border border-slate-700 transition"
                  >
                    RETAKE
                  </button>
                )}
              </div>
            </div>

            {/* Testing Info Box */}
            <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 text-center space-y-1">
              <div className="flex items-center justify-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                <span className="text-[10px] font-mono font-bold text-teal-400 uppercase tracking-wider">
                  TESTING MODE ACTIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Upload any dosimeter photo or test reference card image from your computer to run immediate optical analysis.
              </p>
            </div>
          </div>
        </div>

        <footer className="text-center text-[11px] font-mono text-slate-500 py-3 max-w-md mx-auto w-full">
          SENTRIDOSE — Camera & File Upload Optical Analysis
        </footer>
    </div>
  );
};
