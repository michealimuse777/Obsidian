import { AbsoluteFill, useCurrentFrame, useVideoConfig, Img, interpolate, spring } from "remotion";
import React from "react";

export const ObsidianDemo: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();

    // Basic Animation
    const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
    const scale = spring({
        fps,
        frame,
        config: { damping: 200 },
    });

    return (
        <AbsoluteFill style={{
            backgroundColor: "#0a0210", // Obsidian Dark Background
            color: "white",
            fontFamily: "monospace",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
        }}>
            <div style={{ opacity, transform: `scale(${scale})`, textAlign: "center" }}>
                <h1 style={{
                    fontSize: 120,
                    marginBottom: 20,
                    textTransform: "uppercase",
                    letterSpacing: "0.2em",
                    background: "linear-gradient(to right, #a855f7, #ec4899)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                }}>
                    Obsidian
                </h1>
                <p style={{
                    fontSize: 40,
                    color: "rgba(255,255,255,0.6)",
                    letterSpacing: "0.1em"
                }}>
                    Confidential Launchpad on Solana
                </p>
            </div>

            <div style={{ position: "absolute", bottom: 50, fontSize: 24, opacity: 0.5 }}>
                Hackathon Submission Demo
            </div>
        </AbsoluteFill>
    );
};
