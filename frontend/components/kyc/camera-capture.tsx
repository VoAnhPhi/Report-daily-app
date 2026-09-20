'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Camera,
  RotateCcw,
  Check,
  X,
  SwitchCamera,
  Loader2,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface CameraCaptureProps {
  onCapture: (file: File) => Promise<void>;
  onCancel: () => void;
  title: string;
  instructions: string[];
  aspectRatio?: 'square' | 'document';
}

export function CameraCapture({
  onCapture,
  onCancel,
  title,
  instructions,
  aspectRatio = 'square',
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string>('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const startCamera = useCallback(
    async (isRetry = false) => {
      try {
        setIsLoading(true);
        setError('');

        // Stop existing stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }

        // Add delay for retry to allow camera to reset
        if (isRetry) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Check for multiple cameras
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(
          (device) => device.kind === 'videoinput',
        );
        setHasMultipleCameras(videoDevices.length > 1);

        setIsLoading(false);
        setRetryCount(0); // Reset retry count on success
      } catch (err) {
        console.error('Camera error:', err);
        setRetryCount((prevCount) => {
          const newRetryCount = prevCount + 1;

          if (newRetryCount < 3) {
            // Auto retry up to 3 times
            setTimeout(() => {
              startCamera(true);
            }, 2000);
          } else {
            setError(
              'Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập camera.',
            );
          }

          return newRetryCount;
        });
        setIsLoading(false);
      }
    },
    [facingMode],
  );

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const switchCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions
    const aspectRatioValue = aspectRatio === 'square' ? 1 : 1.6;
    const size = Math.min(video.videoWidth, video.videoHeight);

    if (aspectRatio === 'square') {
      canvas.width = size;
      canvas.height = size;
    } else {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    // Draw video frame to canvas
    if (aspectRatio === 'square') {
      const startX = (video.videoWidth - size) / 2;
      const startY = (video.videoHeight - size) / 2;
      context.drawImage(video, startX, startY, size, size, 0, 0, size, size);
    } else {
      context.drawImage(video, 0, 0);
    }

    // Convert to blob and create file
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const imageUrl = URL.createObjectURL(blob);
          setCapturedImage(imageUrl);
        }
      },
      'image/jpeg',
      0.9,
    );
  }, [aspectRatio]);

  const confirmCapture = useCallback(async () => {
    if (!canvasRef.current) return;

    setIsConfirming(true);

    try {
      canvasRef.current.toBlob(
        async (blob) => {
          if (blob) {
            const file = new File(
              [blob],
              `${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.jpg`,
              {
                type: 'image/jpeg',
              },
            );

            try {
              // Đợi upload hoàn tất
              await onCapture(file);
            } catch (error) {
              console.error('Error uploading file:', error);
              // Không tắt loading nếu upload thất bại để user có thể thử lại
            } finally {
              setIsConfirming(false);
            }
          } else {
            setIsConfirming(false);
          }
        },
        'image/jpeg',
        0.9,
      );
    } catch (error) {
      console.error('Error confirming capture:', error);
      setIsConfirming(false);
    }
  }, [onCapture, title]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }
  }, [capturedImage]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (capturedImage) {
        URL.revokeObjectURL(capturedImage);
      }
    };
  }, []); // Chỉ chạy một lần khi mount

  useEffect(() => {
    startCamera();
  }, [facingMode]); // Chỉ chạy khi facingMode thay đổi

  const overlayStyle =
    aspectRatio === 'square'
      ? 'aspect-square rounded-full'
      : 'aspect-[3/2] rounded-2xl';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className='fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4'
    >
      <Card className='w-full max-w-2xl bg-white/95 backdrop-blur border-0 shadow-2xl'>
        <CardContent className='p-6'>
          <div className='text-center mb-6'>
            <h3 className='text-2xl font-bold text-gray-900 mb-2'>{title}</h3>
            <div className='space-y-1'>
              {instructions.map((instruction, index) => (
                <p key={index} className='text-sm text-gray-600'>
                  {instruction}
                </p>
              ))}
            </div>
          </div>

          <div className='relative'>
            {/* Camera View */}
            <div className='relative bg-black rounded-2xl overflow-hidden'>
              <video
                ref={videoRef}
                className='w-full h-auto'
                playsInline
                muted
                style={{ display: capturedImage ? 'none' : 'block' }}
              />

              {/* Captured Image */}
              {capturedImage && (
                <motion.img
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  src={capturedImage}
                  alt='Captured'
                  className='w-full h-auto'
                />
              )}

              {/* Loading Overlay */}
              {isLoading && (
                <div className='absolute inset-0 bg-black/50 flex items-center justify-center'>
                  <div className='text-center text-white'>
                    <Loader2 className='h-8 w-8 animate-spin mx-auto mb-2' />
                    <p>Đang khởi động camera...</p>
                  </div>
                </div>
              )}

              {/* Error Overlay */}
              {error && (
                <div className='absolute inset-0 bg-red-500/20 flex items-center justify-center'>
                  <div className='text-center text-white bg-red-500 rounded-lg p-4 max-w-sm'>
                    <p className='text-sm mb-3'>{error}</p>
                    {retryCount > 0 && (
                      <p className='text-xs mb-3 opacity-75'>
                        Đã thử {retryCount}/3 lần
                      </p>
                    )}
                    <Button
                      variant='outline'
                      size='sm'
                      className='mt-2 bg-white text-red-500 hover:bg-gray-100'
                      onClick={() => startCamera(true)}
                    >
                      Thử lại
                    </Button>
                  </div>
                </div>
              )}

              {/* Camera Overlay Guide */}
              {!capturedImage && !isLoading && !error && (
                <div className='absolute inset-0 flex items-center justify-center'>
                  <div
                    className={`border-4 border-white/50 ${overlayStyle} pointer-events-none`}
                  >
                    <div className='absolute inset-0 border-4 border-blue-500 animate-pulse rounded-inherit' />
                  </div>
                </div>
              )}

              {/* Camera Switch Button */}
              {hasMultipleCameras && !capturedImage && !isLoading && (
                <Button
                  variant='secondary'
                  size='sm'
                  className='absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white border-0'
                  onClick={switchCamera}
                >
                  <SwitchCamera className='h-4 w-4' />
                </Button>
              )}
            </div>

            {/* Controls */}
            <div className='flex justify-center items-center gap-4 mt-6'>
              {!capturedImage ? (
                <>
                  <Button
                    variant='outline'
                    size='lg'
                    onClick={onCancel}
                    className='px-6'
                  >
                    <X className='h-4 w-4 mr-2' />
                    Hủy
                  </Button>

                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Button
                      size='lg'
                      onClick={capturePhoto}
                      disabled={isLoading || !!error}
                      className='bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full'
                    >
                      <Camera className='h-5 w-5 mr-2' />
                      Chụp ảnh
                    </Button>
                  </motion.div>
                </>
              ) : (
                <>
                  <Button
                    variant='outline'
                    size='lg'
                    onClick={retakePhoto}
                    className='px-6'
                  >
                    <RotateCcw className='h-4 w-4 mr-2' />
                    Chụp lại
                  </Button>

                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Button
                      size='lg'
                      onClick={confirmCapture}
                      disabled={isConfirming}
                      className='bg-green-600 hover:bg-green-700 text-white px-8'
                    >
                      {isConfirming ? (
                        <>
                          <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                          Đang xử lý...
                        </>
                      ) : (
                        <>
                          <Check className='h-4 w-4 mr-2' />
                          Xác nhận
                        </>
                      )}
                    </Button>
                  </motion.div>
                </>
              )}
            </div>
          </div>

          <canvas ref={canvasRef} className='hidden' />
        </CardContent>
      </Card>
    </motion.div>
  );
}
