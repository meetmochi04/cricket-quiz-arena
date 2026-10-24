import { useEffect, useRef, useState } from "react";

export type QuestionAnimationMode = "bowling" | "batting";

interface QuestionAnimationProps {
  mode: QuestionAnimationMode;
  onComplete?: () => void;
}

const BOWLING_FRAMES = Array.from(
  { length: 16 },
  (_, index) => `/F_${index + 1}.png`
);

const BATTING_FRAMES = Array.from(
  { length: 11 },
  (_, index) => `/Image ${index + 1}.png`
);

const FRAME_DURATION = 100;

export default function QuestionAnimation({ mode, onComplete }: QuestionAnimationProps) {
  const frames = mode === "bowling" ? BOWLING_FRAMES : BATTING_FRAMES;
  const [currentFrame, setCurrentFrame] = useState(0);
  const completedRef = useRef(false);
  const callbackRef = useRef(onComplete);

  useEffect(() => {
    callbackRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    completedRef.current = false;
    setCurrentFrame(0);

    frames.forEach((src) => {
      const img = new Image();
      img.src = src;
    });

    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      if (index >= frames.length) {
        window.clearInterval(timer);
        if (!completedRef.current) {
          completedRef.current = true;
          callbackRef.current?.();
        }
        return;
      }
      setCurrentFrame(index);
    }, FRAME_DURATION);

    return () => window.clearInterval(timer);
  }, [mode]);

  return (
    <div
      className={`friend-animation ${mode === "bowling" ? "friend-bowling-animation" : "friend-batting-animation"}`}
      aria-hidden="true"
    >
      <img
        src={frames[currentFrame]}
        alt=""
        className="friend-animation-image"
        draggable={false}
      />
    </div>
  );
}
