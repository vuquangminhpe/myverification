"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  ScanLine,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  User,
  Clock,
  Ticket,
  LogOut,
} from "lucide-react";
import { verifyTicketCode } from "./admin.api";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { useAuth } from "./auth/AuthContext";
import { useRouter } from "next/navigation";

interface VerificationResult {
  booking_id: string;
  ticket_code: string;
  status: string;
  payment_status: string;
  booking_time: string;
  verified_at: string;
}

const TicketVerification: React.FC = () => {
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<VerificationResult | null>(null);
  const [qrScanner, setQrScanner] = useState<Html5Qrcode | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [cameraStatus, setCameraStatus] = useState<
    "idle" | "starting" | "active" | "error"
  >("idle");
  const [lastScannedCode, setLastScannedCode] = useState<string>("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Stop camera và scanner
  const stopCamera = useCallback(async () => {
    // Stop QR scanner
    if (qrScanner) {
      try {
        const currentState = qrScanner.getState();
        if (currentState === Html5QrcodeScannerState.SCANNING) {
          await qrScanner.stop();
        }
        if (currentState !== Html5QrcodeScannerState.NOT_STARTED) {
          await qrScanner.clear();
        }
        setQrScanner(null);
      } catch (err) {
        console.error("Error stopping scanner:", err);
        // Force clear the scanner state
        setQrScanner(null);
      }
    }

    setIsScanning(false);
    setCameraStatus("idle");
  }, [qrScanner]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Component mount and cleanup effect
  useEffect(() => {
    console.log("TicketVerification component mounted");

    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn("Camera not supported in this browser");
      setError("Camera not supported in this browser");
    }

    return () => {
      console.log("TicketVerification component unmounting");
      stopCamera();
    };
  }, [stopCamera]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-16 w-16 text-blue-400 mx-auto mb-4 animate-spin" />
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  const setupQrScanner = () => {
    const scanner = new Html5Qrcode("qr-reader");
    setQrScanner(scanner);
    return scanner;
  };

  const startCamera = async () => {
    try {
      setError(null);
      setCameraStatus("starting");

      // Wait a bit to ensure DOM element is ready
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Check if element exists
      const element = document.getElementById("qr-reader");
      if (!element) {
        throw new Error("QR reader element not found");
      }

      const scanner = setupQrScanner();
      if (!scanner) return;

      const config = {
        fps: 15, // Tăng FPS để detect tốt hơn
        qrbox: function (viewfinderWidth: number, viewfinderHeight: number) {
          // Dynamic qrbox size - 70% of smaller dimension
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdge * 0.7);
          return {
            width: qrboxSize,
            height: qrboxSize,
          };
        },
        aspectRatio: 1.0, // Vuông để tốt hơn cho QR
        rememberLastUsedCamera: true,
        // Tối ưu constraints cho QR scanning
        videoConstraints: {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          facingMode: "environment", // Ưu tiên camera sau
        },
      };

      // Try environment camera first, fallback to user camera
      try {
        await scanner.start(
          { facingMode: "environment" },
          config,
          (decodedText: string) => {
            if (decodedText && decodedText !== lastScannedCode) {
              console.log("QR Code detected:", decodedText);
              setLastScannedCode(decodedText);

              // Verify ticket
              handleVerifyTicket(decodedText);

              // Pause scanning temporarily
              setTimeout(() => {
                setLastScannedCode("");
              }, 3000);
            }
          },
          () => {
            // Completely suppress all scanning errors to avoid console spam
            // These errors are normal when no QR code is in view
          }
        );
      } catch (err: any) {
        console.log(
          "Environment camera not available, trying user camera...",
          err
        );

        try {
          await scanner.start(
            { facingMode: "user" },
            config,
            (decodedText: string) => {
              if (decodedText && decodedText !== lastScannedCode) {
                console.log("QR Code detected:", decodedText);
                setLastScannedCode(decodedText);

                // Verify ticket
                handleVerifyTicket(decodedText);

                // Pause scanning temporarily
                setTimeout(() => {
                  setLastScannedCode("");
                }, 3000);
              }
            },
            () => {
              // Completely suppress all scanning errors to avoid console spam
              // These errors are normal when no QR code is in view
            }
          );
        } catch (userCamErr: any) {
          console.log("User camera also not available", userCamErr);
          throw new Error("No camera available");
        }
      }

      // Add a small delay to ensure video element is created
      setTimeout(() => {
        const videoElement = element.querySelector("video");
        if (videoElement) {
          console.log("✅ Video element found and should be visible");
          console.log(
            "Video dimensions:",
            videoElement.videoWidth,
            "x",
            videoElement.videoHeight
          );
          console.log("Video playing:", !videoElement.paused);

          // Force video to be visible
          videoElement.style.display = "block";
          videoElement.style.width = "100%";
          videoElement.style.height = "100%";
          videoElement.style.objectFit = "cover";

          // Add event listeners for debugging
          videoElement.addEventListener("loadedmetadata", () => {
            console.log("📹 Video metadata loaded:", {
              width: videoElement.videoWidth,
              height: videoElement.videoHeight,
              duration: videoElement.duration,
            });
          });
        } else {
          console.warn("❌ Video element not found after scanner start");
          setError("Video element not created. Try refreshing the page.");
        }
      }, 500);

      setCameraStatus("active");
      setIsScanning(true);
      console.log("QR Scanner started successfully");
    } catch (err) {
      console.error("Error accessing camera:", err);
      setCameraStatus("error");
      setError("Could not access camera: " + (err as Error).message);
    }
  };

  // Play sound feedback
  const playSound = (isSuccess: boolean) => {
    try {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      if (isSuccess) {
        // Success sound: Higher pitch, longer duration
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(
          1000,
          audioContext.currentTime + 0.1
        );
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + 0.3
        );
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } else {
        // Error sound: Lower pitch, shorter duration
        oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(
          200,
          audioContext.currentTime + 0.1
        );
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + 0.2
        );
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      }
    } catch (error) {
      console.log("Audio not supported or error playing sound:", error);
    }
  };

  // Verify ticket code
  const handleVerifyTicket = async (ticketCode: string) => {
    if (!ticketCode.trim()) {
      return;
    }

    setIsVerifying(true);
    setError(null);
    setScanResult(null);

    try {
      const result = await verifyTicketCode(ticketCode.trim());
      setScanResult(result.result);
      console.log("Ticket verification result:", result);

      // Check if ticket is valid (confirmed status and completed payment)
      const isValid =
        result.result.status === "confirmed" &&
        result.result.payment_status === "completed";

      const isUsed = result.result.status === "used";

      if (isValid) {
        playSound(true);
      } else {
        playSound(false);
      }

      // Auto-clear result after 10 seconds
      setTimeout(() => {
        setScanResult(null);
        setError(null);
        setLastScannedCode(""); // Allow rescanning the same code
      }, 10000);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to verify ticket";
      setError(errorMessage);
      playSound(false);

      // Auto-clear error after 5 seconds
      setTimeout(() => {
        setError(null);
        setLastScannedCode(""); // Allow rescanning the same code
      }, 5000);
    } finally {
      setIsVerifying(false);
    }
  };

  // Get verification status
  const getVerificationStatus = () => {
    if (!scanResult) return null;

    const isValid =
      scanResult.status === "confirmed" &&
      scanResult.payment_status === "completed";

    const isUsed = scanResult.status === "used";

    if (isUsed) {
      return {
        isValid: false,
        icon: XCircle,
        color: "text-red-500",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        message: "Ticket Already Used",
        customMessage: `Ticket code ${scanResult.ticket_code} has been used`,
      };
    }

    return {
      isValid,
      icon: isValid ? CheckCircle : XCircle,
      color: isValid ? "text-green-500" : "text-red-500",
      bgColor: isValid ? "bg-green-50" : "bg-red-50",
      borderColor: isValid ? "border-green-200" : "border-red-200",
      message: isValid ? "Valid Ticket" : "Invalid Ticket",
    };
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN");
  };

  const status = getVerificationStatus();

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Ticket Verification
              </h1>
              <p className="text-gray-400">
                Scan or enter ticket codes to verify customer entries
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-white font-medium">Welcome, {user?.name}</p>
                <p className="text-gray-400 text-sm capitalize">
                  {user?.role || "Staff"}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Camera Scanner Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-slate-800 rounded-xl p-6 border border-slate-700"
          >
            <div className="flex items-center gap-3 mb-6">
              <Camera className="h-6 w-6 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">QR Scanner</h2>
            </div>

            {/* Camera View */}
            <div className="relative mb-6">
              <div
                className="aspect-video bg-slate-900 rounded-lg overflow-hidden relative"
                data-testid="video-container"
              >
                {/* Html5Qrcode scanner container */}
                <div
                  id="qr-reader"
                  className={`${
                    cameraStatus === "active" ? "block" : "hidden"
                  }`}
                  style={{
                    width: "100%",
                    height: "100%",
                    minHeight: "300px",
                    position: "relative",
                    backgroundColor: "transparent",
                  }}
                />

                {cameraStatus === "starting" && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <RefreshCw className="h-16 w-16 text-blue-400 mx-auto mb-4 animate-spin" />
                      <p className="text-blue-400">Starting camera...</p>
                    </div>
                  </div>
                )}

                {cameraStatus === "active" && (
                  <>
                    {/* Scanning overlay - only show when actually scanning */}
                    {isScanning && (
                      <div className="absolute inset-0 pointer-events-none z-10">
                        <div className="absolute inset-4 border-2 border-blue-400 rounded-lg">
                          <motion.div
                            className="absolute top-0 left-0 right-0 h-0.5 bg-blue-400"
                            animate={{ y: [0, 200, 0] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                          />
                          {/* Corner brackets for better visual */}
                          <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-blue-400 rounded-tl-lg"></div>
                          <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-blue-400 rounded-tr-lg"></div>
                          <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-blue-400 rounded-bl-lg"></div>
                          <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-blue-400 rounded-br-lg"></div>
                        </div>
                        <ScanLine className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-blue-400" />
                      </div>
                    )}
                  </>
                )}

                {(cameraStatus === "idle" || cameraStatus === "error") && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Camera className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400">
                        {cameraStatus === "error"
                          ? "Camera error"
                          : "Camera not active"}
                      </p>
                      {cameraStatus === "error" && error && (
                        <p className="text-red-400 text-sm mt-2 max-w-xs mx-auto">
                          {error}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Debug info */}
              <div className="mt-2 text-xs text-gray-500 bg-slate-800 p-2 rounded">
                <div>
                  Status: {cameraStatus} | Scanning: {isScanning ? "Yes" : "No"}
                </div>
                <div>
                  Last Code:{" "}
                  {lastScannedCode
                    ? lastScannedCode.substring(0, 15) + "..."
                    : "None"}
                </div>
              </div>
            </div>
            {/* Camera Controls */}
            <div className="flex gap-3">
              {cameraStatus === "idle" || cameraStatus === "error" ? (
                <button
                  onClick={startCamera}
                  disabled={cameraStatus === ("starting" as any)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  <Camera className="h-5 w-5" />
                  Start Scanner
                </button>
              ) : (
                <button
                  onClick={stopCamera}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  <XCircle className="h-5 w-5" />
                  Stop Scanner
                </button>
              )}

              {/* Clear results button */}
              {(scanResult || error) && (
                <button
                  onClick={() => {
                    setScanResult(null);
                    setError(null);
                    setLastScannedCode("");
                  }}
                  className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Manual Input */}
            <div className="mt-6 pt-6 border-t border-slate-700">
              <h3 className="text-lg font-medium text-white mb-4">
                Manual Input
              </h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Enter ticket code manually"
                  className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleVerifyTicket(manualInput);
                    }
                  }}
                />
                <button
                  onClick={() => handleVerifyTicket(manualInput)}
                  disabled={isVerifying}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {isVerifying ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle className="h-5 w-5" />
                  )}
                  Verify
                </button>
              </div>
            </div>
          </motion.div>

          {/* Results Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-slate-800 rounded-xl p-6 border border-slate-700"
          >
            <div className="flex items-center gap-3 mb-6">
              <Ticket className="h-6 w-6 text-purple-400" />
              <h2 className="text-xl font-semibold text-white">
                Verification Result
              </h2>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                    <div>
                      <h3 className="font-medium text-red-800">
                        Verification Failed
                      </h3>
                      <p className="text-red-600 text-sm">{error}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {scanResult && status && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`${status.bgColor} ${status.borderColor} border rounded-lg p-6`}
                >
                  {/* Status Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <status.icon className={`h-8 w-8 ${status.color}`} />
                    <div>
                      <h3 className={`text-lg font-semibold ${status.color}`}>
                        {status.message}
                      </h3>
                      {status.customMessage ? (
                        <p className="text-red-600 font-medium text-sm">
                          {status.customMessage}
                        </p>
                      ) : (
                        <p className="text-black text-sm">
                          Verified at {formatDate(scanResult.verified_at)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Ticket Details */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Ticket className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-black">Ticket Code</p>
                        <p className="font-mono text-black font-medium">
                          {scanResult.ticket_code}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">Booking ID</p>
                        <p className="font-mono text-black font-medium">
                          {scanResult.booking_id}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">Booking Time</p>
                        <p className="font-medium text-black">
                          {formatDate(scanResult.booking_time)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <p
                          className={`font-medium capitalize ${
                            scanResult.status === "confirmed"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {scanResult.status}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Payment</p>
                        <p
                          className={`font-medium capitalize ${
                            scanResult.payment_status === "completed"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {scanResult.payment_status}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {!scanResult && !error && (
                <div className="text-center py-12">
                  <ScanLine className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">
                    Scan a QR code or enter a ticket code to verify
                  </p>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-blue-500 mt-1" />
            <div>
              <h3 className="font-medium text-blue-800 mb-2">
                Verification Instructions
              </h3>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>
                  • Use the camera scanner for QR codes or enter ticket codes
                  manually
                </li>
                <li>• Green result = Valid ticket, allow entry</li>
                <li>• Red result = Invalid ticket, deny entry</li>
                <li className="text-orange-600 font-medium">
                  QR Scanning Tips:
                </li>
                <li className="ml-4">
                  - Hold QR code 10-30cm away from camera
                </li>
                <li className="ml-4">- Ensure good lighting (avoid shadows)</li>
                <li className="ml-4">- Keep QR code flat and steady</li>
                <li className="ml-4">
                  - If camera shows black screen, try refreshing page
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Custom CSS để đảm bảo video hiển thị đúng */}
      <style>{`
        #qr-reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          display: block !important;
          border-radius: 8px;
          background: #000;
        }

        #qr-reader canvas {
          display: none !important;
        }

        #qr-reader > div {
          position: relative !important;
          width: 100% !important;
          height: 100% !important;
          min-height: 300px !important;
        }

        /* Ensure proper aspect ratio */
        #qr-reader {
          min-height: 300px !important;
          background: #1e293b;
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
};

export default TicketVerification;
