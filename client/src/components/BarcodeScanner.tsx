/**
 * @fileoverview Camera-Based QR/Barcode Scanner Component
 * 
 * Provides mobile-friendly barcode/QR scanning using device camera.
 * Perfect for warehouse staff using phones or tablets.
 * 
 * Features:
 * - Device camera access for scanning
 * - Supports QR codes and various barcode formats
 * - Automatic item lookup by SKU/barcode
 * - Visual feedback for scan success/failure
 * - Manual entry fallback
 * - Mobile-optimized interface
 * 
 * @module client/components/BarcodeScanner
 */

// Type definitions for BarcodeDetector API (experimental)
interface BarcodeDetectorResult {
  format: string;
  rawValue: string;
  boundingBox?: DOMRectReadOnly;
  cornerPoints?: { x: number; y: number }[];
}

interface BarcodeDetector {
  detect(image: ImageBitmapSource): Promise<BarcodeDetectorResult[]>;
}

declare global {
  interface Window {
    BarcodeDetector: new (options?: { formats?: string[] }) => BarcodeDetector;
  }
}

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, CameraOff, Check, X, AlertCircle, ScanLine } from "lucide-react";
import { useTheme } from "next-themes";

interface BarcodeScannerProps {
  onItemScanned: (sku: string) => void;
  isProcessing?: boolean;
  lastScanResult?: {
    success: boolean;
    message: string;
    itemName?: string;
  } | null;
}

export default function BarcodeScanner({
  onItemScanned,
  isProcessing = false,
  lastScanResult = null
}: BarcodeScannerProps) {
  const { theme, resolvedTheme } = useTheme();
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize barcode detector if available
  const barcodeDetectorRef = useRef<BarcodeDetector | null>(null);

  useEffect(() => {
    // Check if BarcodeDetector API is available
    if ('BarcodeDetector' in window) {
      try {
        // @ts-ignore - BarcodeDetector is experimental
        barcodeDetectorRef.current = new window.BarcodeDetector({
          formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e']
        });
      } catch (e) {
        console.warn('BarcodeDetector initialization failed:', e);
      }
    }
  }, []);

  const startCamera = async () => {
    try {
      setCameraError(null);
      
      // Request camera access with ideal constraints for barcode scanning
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
        
        // Start scanning loop
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          scanBarcodes();
        };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to access camera';
      console.error('Camera access error:', error);
      setCameraError(errorMessage);
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const scanBarcodes = async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(scanBarcodes);
      return;
    }

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      if (barcodeDetectorRef.current) {
        // Use BarcodeDetector API if available
        const barcodes = await barcodeDetectorRef.current.detect(canvas);
        
        if (barcodes.length > 0) {
          const code = barcodes[0].rawValue;
          
          // Prevent duplicate scans
          if (code !== lastScannedCode) {
            setLastScannedCode(code);
            onItemScanned(code);
            
            // Brief pause after successful scan
            setTimeout(() => {
              setLastScannedCode("");
              animationFrameRef.current = requestAnimationFrame(scanBarcodes);
            }, 1500);
            return;
          }
        }
      }
    } catch (error) {
      console.error('Barcode detection error:', error);
    }

    // Continue scanning
    animationFrameRef.current = requestAnimationFrame(scanBarcodes);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcodeInput.trim()) {
      onItemScanned(barcodeInput.trim());
      setBarcodeInput("");
    }
  };

  const getScanStatusIcon = () => {
    if (!lastScanResult) return null;
    
    if (lastScanResult.success) {
      return <Check className="h-5 w-5 text-green-600" />;
    } else {
      return <X className="h-5 w-5 text-red-600" />;
    }
  };

  const isDark = resolvedTheme === 'dark' || theme === 'dark';
  
  return (
    <Card 
      className="border-2 border-dashed border-gray-300 dark:border-university-blue"
      style={{ backgroundColor: isDark ? 'rgba(23, 37, 84, 0.2)' : 'white' }}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center space-x-2">
            <ScanLine className="h-5 w-5 text-university-blue" />
            <span className="text-foreground">QR/Barcode Scanner</span>
            {isProcessing && (
              <Badge variant="secondary" className="ml-2">
                Processing...
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            variant={isCameraActive ? "destructive" : "default"}
            onClick={isCameraActive ? stopCamera : startCamera}
            disabled={isProcessing}
            className={!isCameraActive ? "bg-university-blue hover:bg-university-dark" : ""}
          >
            {isCameraActive ? (
              <>
                <CameraOff className="h-4 w-4 mr-2" />
                Stop Camera
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                Start Camera
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Camera View */}
        {isCameraActive && (
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-4 border-university-blue rounded-lg w-64 h-48 animate-pulse"></div>
            </div>
            {/* Instruction overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-3 text-center text-sm">
              📱 Point camera at QR code or barcode
            </div>
          </div>
        )}

        {/* Hidden canvas for barcode detection */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Camera Error */}
        {cameraError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-800 dark:text-red-200">
              <strong>Camera Error:</strong> {cameraError}
            </p>
            <p className="text-xs text-red-600 dark:text-red-300 mt-1">
              Please check camera permissions in your browser settings.
            </p>
          </div>
        )}

        {/* Manual Barcode Entry */}
        <form onSubmit={handleManualSubmit} className="flex space-x-2">
          <Input
            type="text"
            placeholder="Or manually enter SKU/barcode..."
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            disabled={isProcessing}
            className="flex-1"
            autoComplete="off"
          />
          <Button 
            type="submit" 
            disabled={!barcodeInput.trim() || isProcessing}
            className="bg-university-blue hover:bg-university-dark"
          >
            Add
          </Button>
        </form>

        {/* Scan Status Feedback */}
        {lastScanResult && (
          <div className={`flex items-start space-x-2 p-3 rounded-lg ${
            lastScanResult.success 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            {getScanStatusIcon()}
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                lastScanResult.success 
                  ? 'text-green-800 dark:text-green-200' 
                  : 'text-red-800 dark:text-red-200'
              }`}>
                {lastScanResult.message}
              </p>
              {lastScanResult.itemName && (
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  {lastScanResult.itemName}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Scanner Instructions */}
        <div 
          className="p-3 rounded-lg border border-gray-200 dark:border-blue-700"
          style={{ backgroundColor: isDark ? 'rgba(30, 58, 138, 0.2)' : 'white' }}
        >
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-gray-700 dark:text-blue-300 space-y-1">
              <p className="font-medium text-gray-900 dark:text-blue-200">Quick Start:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>Click "Start Camera" to scan QR codes or barcodes</li>
                <li>Point your device camera at the code on the shelf</li>
                <li>Item will be automatically added to your quote</li>
                <li>Or manually enter SKU/barcode in the field above</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
