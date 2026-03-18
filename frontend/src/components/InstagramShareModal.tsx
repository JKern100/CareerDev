"use client";

import { useState, useRef, useCallback } from "react";
import { PathwayResult } from "@/lib/api";
import ShareCard from "./ShareCard";
import InstagramIcon from "./InstagramIcon";
import { shareToInstagram, downloadShareImage, isMobileDevice } from "@/utils/shareImage";

interface InstagramShareModalProps {
  pathways: PathwayResult[];
  open: boolean;
  onClose: () => void;
}

export default function InstagramShareModal({ pathways, open, onClose }: InstagramShareModalProps) {
  const [format, setFormat] = useState<"story" | "post">("story");
  const [sharing, setSharing] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleShare = useCallback(async () => {
    setSharing(true);
    try {
      const usedNativeShare = await shareToInstagram();
      if (!usedNativeShare) {
        setDownloaded(true);
      }
    } catch {
      // User cancelled share dialog
    } finally {
      setSharing(false);
    }
  }, []);

  const handleDownload = useCallback(async () => {
    setSharing(true);
    try {
      await downloadShareImage(`careerdev-${format}.png`);
      setDownloaded(true);
    } finally {
      setSharing(false);
    }
  }, [format]);

  if (!open) return null;

  const mobile = isMobileDevice();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "var(--card)",
          borderRadius: "16px",
          border: "1px solid var(--border)",
          padding: "24px",
          maxWidth: "480px",
          width: "calc(100% - 32px)",
          maxHeight: "90vh",
          overflowY: "auto",
          position: "relative",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            background: "none",
            border: "none",
            fontSize: "24px",
            cursor: "pointer",
            color: "var(--muted)",
            padding: "4px 8px",
            lineHeight: 1,
          }}
          aria-label="Close"
        >
          &times;
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <InstagramIcon size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "16px" }}>Share on Instagram</div>
            <div style={{ fontSize: "13px", color: "var(--muted)" }}>
              Share your career matches with friends
            </div>
          </div>
        </div>

        {/* Format toggle */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "16px",
            background: "#f3f4f6",
            borderRadius: "10px",
            padding: "4px",
          }}
        >
          {(["story", "post"] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFormat(f); setDownloaded(false); }}
              style={{
                flex: 1,
                padding: "8px",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                background: format === f ? "#fff" : "transparent",
                color: format === f ? "var(--fg)" : "var(--muted)",
                boxShadow: format === f ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s",
              }}
            >
              {f === "story" ? "Story (9:16)" : "Post (1:1)"}
            </button>
          ))}
        </div>

        {/* Preview */}
        <div
          style={{
            borderRadius: "12px",
            overflow: "hidden",
            marginBottom: "16px",
            border: "1px solid var(--border)",
            height: format === "story" ? `${Math.round(1920 * 0.222)}px` : `${Math.round(1080 * 0.4)}px`,
            position: "relative",
          }}
        >
          <div
            ref={cardRef}
            style={{
              transform: format === "story" ? "scale(0.222)" : "scale(0.4)",
              transformOrigin: "top left",
              width: "1080px",
              height: format === "story" ? "1920px" : "1080px",
              position: "absolute",
              top: 0,
              left: 0,
            }}
          >
            <ShareCard pathways={pathways} format={format} />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button
            onClick={handleShare}
            disabled={sharing}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "12px 20px",
              border: "none",
              borderRadius: "10px",
              fontSize: "15px",
              fontWeight: 600,
              cursor: sharing ? "not-allowed" : "pointer",
              color: "#fff",
              background: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
              opacity: sharing ? 0.6 : 1,
              transition: "opacity 0.15s",
            }}
          >
            <InstagramIcon size={18} color="#fff" />
            {sharing ? "Preparing..." : mobile ? "Share to Instagram" : "Download & Share"}
          </button>

          <button
            onClick={handleDownload}
            disabled={sharing}
            className="btn btn-outline"
            style={{ width: "100%" }}
          >
            {downloaded ? "Downloaded!" : "Download Image"}
          </button>

          {!mobile && (
            <p style={{ fontSize: "12px", color: "var(--muted)", textAlign: "center", marginTop: "4px" }}>
              Save the image, then share it on Instagram from your phone
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
