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
  X,
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
  user?: {
    _id: string;
    name: string;
    email: string;
    avatar: string;
    phone: string;
  };
  movie?: {
    _id: string;
    title: string;
    poster_url: string;
    duration: number;
    language: string;
  };
  theater?: {
    _id: string;
    name: string;
    location: string;
  };
  screen?: {
    _id: string;
    name: string;
    screen_type: string;
  };
  showtime?: {
    _id: string;
    start_time: string;
    end_time: string;
  };
  seats?: Array<{
    row: string;
    number: number;
    type: string;
    price: number;
  }>;
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
  const [scanCooldown, setScanCooldown] = useState<number>(0);

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
        fps: 10, // Reduced FPS for better mobile performance
        qrbox: function (viewfinderWidth: number, viewfinderHeight: number) {
          // Smaller qrbox for mobile devices
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdge * 0.6); // Reduced from 0.7 to 0.6
          return {
            width: qrboxSize,
            height: qrboxSize,
          };
        },
        aspectRatio: 1.0,
        rememberLastUsedCamera: true,
        // Optimized constraints for mobile devices
        videoConstraints: {
          width: { min: 320, ideal: 640, max: 1280 }, // Lower resolution for mobile
          height: { min: 240, ideal: 480, max: 720 },
          facingMode: "environment",
        },
        // Add mobile-specific optimizations
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      };

      // Enhanced camera selection for mobile
      try {
        // First try to get available cameras
        const cameras = await Html5Qrcode.getCameras();
        console.log("Available cameras:", cameras);

        // Find rear camera for mobile
        const rearCamera = cameras.find(
          (camera) =>
            camera.label.toLowerCase().includes("back") ||
            camera.label.toLowerCase().includes("rear") ||
            camera.label.toLowerCase().includes("environment")
        );

        const cameraId = rearCamera
          ? rearCamera.id
          : { facingMode: "environment" };

        await scanner.start(
          cameraId,
          config,
          (decodedText: string) => {
            if (decodedText && decodedText !== lastScannedCode) {
              console.log("QR Code detected:", decodedText);
              setLastScannedCode(decodedText);
              handleVerifyTicket(decodedText);

              // Start cooldown timer
              setScanCooldown(20);
              const cooldownInterval = setInterval(() => {
                setScanCooldown((prev) => {
                  if (prev <= 1) {
                    clearInterval(cooldownInterval);
                    setLastScannedCode("");
                    return 0;
                  }
                  return prev - 1;
                });
              }, 1000);
            }
          },
          () => {
            // Suppress scanning errors
          }
        );
      } catch (err: any) {
        console.log("Rear camera not available, trying front camera...", err);

        try {
          await scanner.start(
            { facingMode: "user" },
            config,
            (decodedText: string) => {
              if (decodedText && decodedText !== lastScannedCode) {
                console.log("QR Code detected:", decodedText);
                setLastScannedCode(decodedText);
                handleVerifyTicket(decodedText);

                // Start cooldown timer
                setScanCooldown(20);
                const cooldownInterval = setInterval(() => {
                  setScanCooldown((prev) => {
                    if (prev <= 1) {
                      clearInterval(cooldownInterval);
                      setLastScannedCode("");
                      return 0;
                    }
                    return prev - 1;
                  });
                }, 1000);
              }
            },
            () => {
              // Suppress scanning errors
            }
          );
        } catch (userCamErr: any) {
          console.log("Front camera also not available", userCamErr);
          throw new Error("No camera available");
        }
      }

      setIsScanning(true);
      setCameraStatus("active");
    } catch (err: any) {
      console.error("Error starting camera:", err);
      setError(`Camera error: ${err.message}`);
      setCameraStatus("error");
      setIsScanning(false);
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
    if (!ticketCode.trim() || isVerifying) {
      return; // Prevent multiple calls if already verifying
    }

    setIsVerifying(true);
    setError(null);
    setScanResult(null);

    try {
      const result = await verifyTicketCode(ticketCode.trim());
      setScanResult(result.result);

      // Check if ticket is valid (confirmed status and completed payment)
      const isValid =
        result.result.status === "confirmed" &&
        result.result.payment_status === "completed";

      const isUsed = result.result.status === "used";
      const isPending = result.result.payment_status === "pending";
      const isCancelled = result.result.payment_status === "cancelled";

      // Play appropriate sound based on status
      if (isValid) {
        playSound(true); // Success sound
      } else if (isPending || isCancelled) {
        // For pending/cancelled, we might want a different sound or no sound
        // For now, using false (error sound) but could be customized
        playSound(false);
      } else {
        playSound(false); // Error sound for invalid/used tickets
      }

      // Clear manual input after successful verification
      setManualInput("");
    } catch (err: any) {
      const errorMessage = err.message || "Failed to verify ticket";
      setError(errorMessage);
      playSound(false);
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
    const isPending = scanResult.payment_status === "pending";
    const isCancelled = scanResult.payment_status === "cancelled";

    // Ticket already used
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

    // Payment pending
    if (isPending) {
      return {
        isValid: false,
        icon: AlertTriangle,
        color: "text-yellow-500",
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-200",
        message: "Payment Pending",
        customMessage: `Payment for ticket ${scanResult.ticket_code} is still pending`,
      };
    }

    // Payment cancelled
    if (isCancelled) {
      return {
        isValid: false,
        icon: XCircle,
        color: "text-orange-500",
        bgColor: "bg-orange-50",
        borderColor: "border-orange-200",
        message: "Payment Cancelled",
        customMessage: `Payment for ticket ${scanResult.ticket_code} has been cancelled`,
      };
    }

    // Valid or invalid ticket
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
                {scanCooldown > 0 && (
                  <div className="text-yellow-400">
                    Scan cooldown: {scanCooldown}s remaining
                  </div>
                )}
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
                    setScanCooldown(0); // Reset cooldown
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isVerifying) {
                      e.preventDefault();
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-6 w-6 text-red-500" />
                      <div>
                        <h3 className="font-medium text-red-800">
                          Verification Failed
                        </h3>
                        <p className="text-red-600 text-sm">{error}</p>
                      </div>
                    </div>
                    {/* Close button */}
                    <button
                      onClick={() => {
                        setError(null);
                        setLastScannedCode(""); // Allow rescanning the same code
                        setScanCooldown(0); // Reset cooldown
                      }}
                      className="p-2 hover:bg-red-100 rounded-full transition-colors"
                      title="Close error"
                    >
                      <X className="h-5 w-5 text-red-500" />
                    </button>
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
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
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
                    {/* Close button */}
                    <button
                      onClick={() => {
                        setScanResult(null);
                        setError(null);
                        setLastScannedCode(""); // Allow rescanning the same code
                        setScanCooldown(0); // Reset cooldown
                      }}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      title="Close result"
                    >
                      <X className="h-5 w-5 text-gray-500" />
                    </button>
                  </div>

                  {/* Customer Information */}
                  {scanResult.user && (
                    <div className="mb-6 p-4 bg-white rounded-lg border">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Customer Information
                      </h4>
                      <div className="flex items-center gap-4">
                        <img
                          src={scanResult.user.avatar || "/default-avatar.png"}
                          alt={scanResult.user.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                        />
                        <div>
                          <p className="font-medium text-gray-800">
                            {scanResult.user.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {scanResult.user.email}
                          </p>
                          {scanResult.user.phone && (
                            <p className="text-sm text-gray-600">
                              {scanResult.user.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Movie & Theater Information */}
                  <div className="mb-6 p-4 bg-white rounded-lg border">
                    <h4 className="font-semibold text-gray-800 mb-3">
                      Booking Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Movie Info */}
                      {scanResult.movie && (
                        <div className="flex gap-3">
                          <img
                            src={scanResult.movie.poster_url}
                            alt={scanResult.movie.title}
                            className="w-16 h-20 object-cover rounded"
                          />
                          <div>
                            <p className="font-medium text-gray-800">
                              {scanResult.movie.title}
                            </p>
                            <p className="text-sm text-gray-600">
                              {scanResult.movie.duration} mins
                            </p>
                            <p className="text-sm text-gray-600">
                              {scanResult.movie.language}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Theater & Screen Info */}
                      <div>
                        {scanResult.theater && (
                          <div className="mb-2">
                            <p className="font-medium text-gray-800">
                              {scanResult.theater.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {scanResult.theater.location}
                            </p>
                          </div>
                        )}
                        {scanResult.screen && (
                          <div>
                            <p className="text-sm text-gray-600">
                              {scanResult.screen.name} (
                              {scanResult.screen.screen_type.toUpperCase()})
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Showtime & Seats */}
                  <div className="mb-6 p-4 bg-white rounded-lg border">
                    <h4 className="font-semibold text-gray-800 mb-3">
                      Session Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {scanResult.showtime && (
                        <div>
                          <p className="text-sm text-gray-600">Showtime</p>
                          <p className="font-medium text-gray-800">
                            {formatDate(scanResult.showtime.start_time)}
                          </p>
                        </div>
                      )}
                      {scanResult.seats && scanResult.seats.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-600">Seats</p>
                          <p className="font-medium text-gray-800">
                            {scanResult.seats
                              .map((seat) => `${seat.row}${seat.number}`)
                              .join(", ")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ticket Details */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Ticket className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">Ticket Code</p>
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
                <li>
                  • Red result = Invalid ticket or used ticket, deny entry
                </li>
                <li>• Yellow result = Payment pending, deny entry</li>
                <li>• Orange result = Payment cancelled, deny entry</li>
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
