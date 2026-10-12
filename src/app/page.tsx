"use client";

import { useEffect, useRef, useState } from "react";

interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  vx: number;
  vy: number;
  alpha: number;
}

export default function GlowDrawPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hue, setHue] = useState(190);
  const [cameraActive, setCameraActive] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const particlesRef = useRef<Particle[]>([]);
  const handsRef = useRef<any>(null);
  const animFrameId = useRef<number | null>(null);
  const hueRef = useRef(hue);

  useEffect(() => {
    hueRef.current = hue;
  }, [hue]);

  useEffect(() => {
    let isMounted = true;

    const setupApp = async () => {
      try {
        // 1. Tải script MediaPipe Hands từ CDN
        if (!(window as any).Hands) {
          await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js";
            script.crossOrigin = "anonymous";
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
          });
        }

        if (!isMounted) return;

        const Hands = (window as any).Hands;
        if (!Hands) throw new Error("Không thể tải thư viện nhận diện bàn tay.");

        const hands = new Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });

        hands.onResults((results: any) => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          if (videoRef.current && (canvas.width !== videoRef.current.videoWidth || canvas.height !== videoRef.current.videoHeight)) {
            canvas.width = videoRef.current.videoWidth || 1280;
            canvas.height = videoRef.current.videoHeight || 720;
          }

          ctx.save();
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Vẽ luồng video từ webcam làm nền
          if (results.image) {
            ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
          }

          // Lớp phủ tối nhẹ tạo hiệu ứng phát sáng
          ctx.fillStyle = "rgba(10, 15, 26, 0.4)";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Nhận diện đầu ngón trỏ
          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            setIsDrawing(true);
            const landmarks = results.multiHandLandmarks[0];
            const indexFinger = landmarks[8];

            const x = indexFinger.x * canvas.width;
            const y = indexFinger.y * canvas.height;

            for (let i = 0; i < 5; i++) {
              particlesRef.current.push({
                x,
                y,
                size: Math.random() * 9 + 3,
                color: `hsla(${hueRef.current}, 100%, 65%, 1)`,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3,
                alpha: 1,
              });
            }
          } else {
            setIsDrawing(false);
          }

          // Vẽ các hạt phát sáng
          particlesRef.current.forEach((p, index) => {
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.02;
            p.size *= 0.96;

            if (p.alpha <= 0) {
              particlesRef.current.splice(index, 1);
              return;
            }

            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.shadowBlur = 18;
            ctx.shadowColor = p.color;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          });

          ctx.restore();
        });

        handsRef.current = hands;

        // 2. Yêu cầu bật Camera qua Web API gốc
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraActive(true);

          // Vòng lặp gửi frame liên tục sang MediaPipe
          const processFrame = async () => {
            if (videoRef.current && handsRef.current) {
              await handsRef.current.send({ image: videoRef.current });
            }
            if (isMounted) {
              animFrameId.current = requestAnimationFrame(processFrame);
            }
          };
          processFrame();
        }
      } catch (err: any) {
        console.error(err);
        setErrorMessage("Vui lòng cấp quyền mở Camera trên trình duyệt!");
      }
    };

    setupApp();

    return () => {
      isMounted = false;
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      if (handsRef.current) handsRef.current.close();
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const clearCanvas = () => {
    particlesRef.current = [];
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-between p-4 md:p-6 relative overflow-hidden bg-slate-950">
      <header className="w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4 glass-panel p-4 md:px-6 rounded-3xl z-20 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xl">
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 bg-clip-text text-transparent">
            AI Glow Finger Draw
            </h1>
            <p className="text-xs text-slate-400">Vẽ vệt sáng hạt Neon bằng ngón tay qua Webcam</p>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2 bg-slate-900/60 px-3.5 py-2 rounded-2xl border border-white/10">
            <span className="text-xs text-slate-300 font-medium">Màu sắc:</span>
            <input
              type="range"
              min="0"
              max="360"
              value={hue}
              onChange={(e) => setHue(Number(e.target.value))}
              className="w-24 accent-indigo-500 cursor-pointer"
            />
            <div
              className="w-4 h-4 rounded-full border border-white/40 shadow-sm"
              style={{ backgroundColor: `hsl(${hue}, 100%, 60%)` }}
            />
          </div>

          <button
            onClick={clearCanvas}
            className="glass-btn px-4 py-2 rounded-2xl text-xs font-semibold text-slate-200 cursor-pointer"
          >
             Xóa màn hình
          </button>
        </div>
      </header>

      {/* Khung hiển thị Camera & Canvas vẽ */}
      <div className="w-full max-w-5xl my-auto relative aspect-video rounded-3xl overflow-hidden glass-panel border border-white/10 shadow-2xl flex items-center justify-center bg-black">
        {!cameraActive && !errorMessage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400 z-20 bg-slate-950/80">
            <div className="w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Đang kết nối Camera & AI...</p>
          </div>
        )}

        {errorMessage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-rose-400 z-20 bg-slate-950/90 p-4 text-center">
            <p className="text-base font-semibold">⚠️ {errorMessage}</p>
            <p className="text-xs text-slate-400">Hãy nhấn vào biểu tượng Camera/Ổ khóa cạnh địa chỉ web trên trình duyệt để cho phép.</p>
          </div>
        )}

        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas ref={canvasRef} className="w-full h-full object-cover transform -scale-x-100" />

        {cameraActive && (
          <div className="absolute bottom-4 left-4 glass-btn px-3 py-1.5 rounded-full text-[11px] font-medium flex items-center gap-2 z-10">
            <span className={`w-2 h-2 rounded-full ${isDrawing ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            {isDrawing ? "Đang nhận diện ngón tay!" : "Giơ ngón trỏ để bắt đầu vẽ"}
          </div>
        )}
      </div>

      <footer className="text-center text-xs text-slate-400 z-20">
         <span className="text-slate-300 font-medium">Mẹo sử dụng:</span> Giơ bàn tay hướng về phía Camera và dùng đầu <strong className="text-indigo-300">ngón trỏ</strong> di chuyển để vẽ vệt sáng phát sáng!
      </footer>
    </main>
  );
}