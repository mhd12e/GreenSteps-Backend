import { useCallback, useEffect, useRef, useState } from "react";
import { api_base } from "../config";

const CHECK_INTERVAL_MS = 15000;
const TIMEOUT_MS = 5000;

export const useBackendStatus = () => {
  const [isDown, setIsDown] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const inFlightRef = useRef(false);

  const checkNow = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsChecking(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(`${api_base}/system/health`, {
        method: "GET",
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error("Health check failed");
      }
      setIsDown(false);
    } catch (error) {
      setIsDown(true);
    } finally {
      clearTimeout(timeoutId);
      inFlightRef.current = false;
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkNow();
    const id = setInterval(() => {
      checkNow();
    }, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [checkNow]);

  return { isDown, isChecking, checkNow };
};
