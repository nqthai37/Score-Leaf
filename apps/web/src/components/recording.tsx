"use client";
import { useEffect, useRef, useState } from "react";
import { metadata, recordings, readLocal, writeLocal } from "@/lib/learning";
export function Recording({
  assetId,
  text,
}: {
  assetId?: string;
  text?: string;
}) {
  const asset =
      metadata.audio.find((a) => a.id === assetId) ||
      recordings.find((a) => a.text === text),
    player = useRef<HTMLAudioElement>(null),
    [rate, setRate] = useState(0.92),
    [speaker, setSpeaker] = useState("Faye & Dmitri");
  useEffect(() => {
    setRate(readLocal("toeic-path-voices-v1", { rate: 0.92 }).rate);
    const audio = player.current;
    return () => {
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
    };
  }, [asset?.src]);
  useEffect(() => {
    if (player.current) {
      player.current.playbackRate = rate;
      player.current.preservesPitch = true;
    }
  }, [rate, asset?.src]);
  if (!asset)
    return (
      <p className="note">Recording unavailable. Use the transcript below.</p>
    );
  return (
    <div className="recording">
      <small>HeyGen · {speaker}</small>
      <audio
        data-study="true"
        key={asset.src}
        ref={player}
        controls
        preload="none"
        src={"/" + asset.src}
        onError={() =>
          setSpeaker("Audio could not load — retry or use transcript")
        }
        onTimeUpdate={() => {
          const turn = asset.turns.find(
            (t) =>
              t.start <= (player.current?.currentTime || 0) &&
              t.end > (player.current?.currentTime || 0),
          );
          setSpeaker(
            turn
              ? turn.role === "female"
                ? "Faye"
                : "Dmitri"
              : "Faye & Dmitri",
          );
        }}
      />
      <label>
        Playback speed
        <select
          value={rate}
          onChange={(e) => {
            const value = Number(e.target.value);
            setRate(value);
            writeLocal("toeic-path-voices-v1", { rate: value });
          }}
        >
          {[0.85, 0.92, 1, 1.1].map((r) => (
            <option key={r} value={r}>
              {r}×
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
