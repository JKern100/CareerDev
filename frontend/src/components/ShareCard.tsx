"use client";

import { useEffect, useRef } from "react";
import { PathwayResult } from "@/lib/api";
import { renderShareCard } from "@/utils/shareImage";

interface ShareCardProps {
  pathways: PathwayResult[];
  format: "story" | "post";
}

export default function ShareCard({ pathways, format }: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || pathways.length === 0) return;
    renderShareCard(canvas, { format, pathways });
  }, [pathways, format]);

  return (
    <canvas
      ref={canvasRef}
      id="share-card"
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
