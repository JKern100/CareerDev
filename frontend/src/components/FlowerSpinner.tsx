"use client";

interface FlowerSpinnerProps {
  size?: number;
  className?: string;
}

export default function FlowerSpinner({ size = 48, className = "" }: FlowerSpinnerProps) {
  return (
    <div className={`flower-spinner ${className}`} style={{ width: size, height: size }}>
      <img
        src="/logo.svg"
        alt="Loading"
        width={size}
        height={size}
        style={{ width: size, height: size }}
      />
    </div>
  );
}
