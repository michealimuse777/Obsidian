import React from "react";
import {
    AbsoluteFill,
    useCurrentFrame,
    useVideoConfig,
    interpolate,
    spring,
    Sequence,
    Easing,
} from "remotion";

// ═══════════════════════════════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════════════════════════════
const COLORS = {
    bg: "#0B0E17",
    purple: "#9B6CFF",
    cyan: "#6AE3FF",
    white: "#FFFFFF",
    gray: "rgba(255,255,255,0.6)",
    darkGray: "rgba(255,255,255,0.3)",
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════
const FadeIn: React.FC<{ children: React.ReactNode; delay?: number }> = ({
    children,
    delay = 0,
}) => {
    const frame = useCurrentFrame();
    const opacity = interpolate(frame - delay, [0, 20], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });
    const y = interpolate(frame - delay, [0, 20], [30, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
    });
    return (
        <div style={{ opacity, transform: `translateY(${y}px)` }}>{children}</div>
    );
};

const GlowText: React.FC<{
    children: React.ReactNode;
    color?: string;
    size?: number;
}> = ({ children, color = COLORS.purple, size = 80 }) => (
    <span
        style={{
            fontSize: size,
            fontWeight: 800,
            color,
            textShadow: `0 0 40px ${color}, 0 0 80px ${color}`,
            letterSpacing: "0.05em",
        }}
    >
        {children}
    </span>
);

const Caption: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p
        style={{
            fontSize: 32,
            color: COLORS.gray,
            marginTop: 20,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
        }}
    >
        {children}
    </p>
);

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: INTRO (5 seconds = 150 frames @ 30fps)
// ═══════════════════════════════════════════════════════════════════════════════
const IntroSection: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const scale = spring({ fps, frame, config: { damping: 100, stiffness: 200 } });
    const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });

    return (
        <AbsoluteFill
            style={{
                backgroundColor: COLORS.bg,
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "column",
            }}
        >
            <div style={{ opacity, transform: `scale(${scale})`, textAlign: "center" }}>
                <GlowText size={120}>OBSIDIAN</GlowText>
                <Caption>Privacy-Preserving Token Launchpad on Solana</Caption>
            </div>

            {/* Decorative rings */}
            <div
                style={{
                    position: "absolute",
                    width: 600,
                    height: 600,
                    border: `2px solid ${COLORS.purple}`,
                    borderRadius: "50%",
                    opacity: 0.1 + Math.sin(frame / 20) * 0.05,
                }}
            />
            <div
                style={{
                    position: "absolute",
                    width: 800,
                    height: 800,
                    border: `1px solid ${COLORS.cyan}`,
                    borderRadius: "50%",
                    opacity: 0.08,
                }}
            />
        </AbsoluteFill>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: PROBLEM (15 seconds = 450 frames)
// ═══════════════════════════════════════════════════════════════════════════════
const ProblemSection: React.FC = () => {
    const frame = useCurrentFrame();

    const problems = [
        { text: "Bid amounts are PUBLIC", icon: "👁️", delay: 0 },
        { text: "Front-running & MEV extraction", icon: "🏃", delay: 40 },
        { text: "Price manipulation by whales", icon: "🐋", delay: 80 },
        { text: "Unfair token allocations", icon: "⚖️", delay: 120 },
    ];

    return (
        <AbsoluteFill
            style={{
                backgroundColor: COLORS.bg,
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "column",
                padding: 100,
            }}
        >
            <FadeIn>
                <h1 style={{ fontSize: 64, color: COLORS.white, marginBottom: 60 }}>
                    The Problem with{" "}
                    <span style={{ color: "#FF6B6B" }}>Traditional Launchpads</span>
                </h1>
            </FadeIn>

            <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
                {problems.map((p, i) => {
                    const show = frame > p.delay;
                    const opacity = interpolate(frame - p.delay, [0, 20], [0, 1], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                    });
                    const x = interpolate(frame - p.delay, [0, 20], [-50, 0], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                    });

                    return (
                        <div
                            key={i}
                            style={{
                                opacity: show ? opacity : 0,
                                transform: `translateX(${x}px)`,
                                display: "flex",
                                alignItems: "center",
                                gap: 20,
                                fontSize: 40,
                                color: COLORS.white,
                            }}
                        >
                            <span style={{ fontSize: 50 }}>{p.icon}</span>
                            <span>{p.text}</span>
                        </div>
                    );
                })}
            </div>
        </AbsoluteFill>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: SOLUTION (20 seconds = 600 frames)
// ═══════════════════════════════════════════════════════════════════════════════
const SolutionSection: React.FC = () => {
    const frame = useCurrentFrame();

    const features = [
        { title: "Encrypted Bids", desc: "Client-side encryption before submission", icon: "🔐" },
        { title: "Cypher Node", desc: "Confidential computation in TEE", icon: "🖥️" },
        { title: "AI Allocation", desc: "Fair, intelligent token distribution", icon: "🤖" },
        { title: "Zero Leakage", desc: "Bid amounts never publicly revealed", icon: "🛡️" },
    ];

    return (
        <AbsoluteFill
            style={{
                backgroundColor: COLORS.bg,
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "column",
                padding: 80,
            }}
        >
            <FadeIn>
                <h1 style={{ fontSize: 72, marginBottom: 60 }}>
                    <GlowText color={COLORS.cyan} size={72}>
                        The Obsidian Solution
                    </GlowText>
                </h1>
            </FadeIn>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 50,
                    width: "100%",
                    maxWidth: 1400,
                }}
            >
                {features.map((f, i) => {
                    const delay = i * 50 + 30;
                    const opacity = interpolate(frame - delay, [0, 25], [0, 1], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                    });
                    const scale = interpolate(frame - delay, [0, 25], [0.8, 1], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                    });

                    return (
                        <div
                            key={i}
                            style={{
                                opacity,
                                transform: `scale(${scale})`,
                                background: "rgba(155,108,255,0.1)",
                                border: `1px solid ${COLORS.purple}`,
                                borderRadius: 20,
                                padding: 40,
                                textAlign: "center",
                            }}
                        >
                            <div style={{ fontSize: 60, marginBottom: 15 }}>{f.icon}</div>
                            <h3 style={{ fontSize: 36, color: COLORS.white, marginBottom: 10 }}>
                                {f.title}
                            </h3>
                            <p style={{ fontSize: 24, color: COLORS.gray }}>{f.desc}</p>
                        </div>
                    );
                })}
            </div>
        </AbsoluteFill>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: ARCHITECTURE FLOW (30 seconds = 900 frames)
// ═══════════════════════════════════════════════════════════════════════════════
const ArchitectureSection: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const steps = [
        { label: "User Wallet", color: COLORS.white },
        { label: "Encrypt Bid", color: COLORS.purple },
        { label: "Solana Program", color: COLORS.cyan },
        { label: "Cypher Node", color: COLORS.purple },
        { label: "AI Scoring", color: "#FF6B6B" },
        { label: "Allocation", color: COLORS.cyan },
        { label: "Claim Tokens", color: "#4ADE80" },
    ];

    return (
        <AbsoluteFill
            style={{
                backgroundColor: COLORS.bg,
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "column",
                padding: 80,
            }}
        >
            <FadeIn>
                <h1 style={{ fontSize: 60, color: COLORS.white, marginBottom: 80 }}>
                    How It Works
                </h1>
            </FadeIn>

            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                {steps.map((step, i) => {
                    const delay = i * 80 + 40;
                    const opacity = interpolate(frame - delay, [0, 30], [0, 1], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                    });
                    const y = interpolate(frame - delay, [0, 30], [20, 0], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                    });

                    const showArrow = i < steps.length - 1 && frame > delay + 30;

                    return (
                        <React.Fragment key={i}>
                            <div
                                style={{
                                    opacity,
                                    transform: `translateY(${y}px)`,
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                }}
                            >
                                <div
                                    style={{
                                        width: 100,
                                        height: 100,
                                        borderRadius: 20,
                                        background: `linear-gradient(135deg, ${step.color}33, ${step.color}11)`,
                                        border: `2px solid ${step.color}`,
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        marginBottom: 15,
                                        boxShadow: `0 0 30px ${step.color}44`,
                                    }}
                                >
                                    <span style={{ fontSize: 36, fontWeight: 700, color: step.color }}>
                                        {i + 1}
                                    </span>
                                </div>
                                <span
                                    style={{
                                        fontSize: 18,
                                        color: COLORS.white,
                                        textAlign: "center",
                                        maxWidth: 100,
                                    }}
                                >
                                    {step.label}
                                </span>
                            </div>

                            {showArrow && (
                                <div
                                    style={{
                                        fontSize: 30,
                                        color: COLORS.gray,
                                        opacity: interpolate(frame - delay - 30, [0, 15], [0, 1], {
                                            extrapolateLeft: "clamp",
                                            extrapolateRight: "clamp",
                                        }),
                                    }}
                                >
                                    →
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Tagline */}
            <FadeIn delay={600}>
                <p
                    style={{
                        marginTop: 80,
                        fontSize: 28,
                        color: COLORS.gray,
                        textAlign: "center",
                    }}
                >
                    Powered by <span style={{ color: COLORS.purple }}>Arcium</span> Confidential
                    Computing + <span style={{ color: COLORS.cyan }}>Solana</span>
                </p>
            </FadeIn>
        </AbsoluteFill>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: DEMO + CLOSING (15 seconds = 450 frames)
// ═══════════════════════════════════════════════════════════════════════════════
const ClosingSection: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const scale = spring({
        fps,
        frame: frame - 30,
        config: { damping: 80 },
    });

    const pulseOpacity = 0.3 + Math.sin(frame / 10) * 0.2;

    return (
        <AbsoluteFill
            style={{
                backgroundColor: COLORS.bg,
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "column",
            }}
        >
            {/* Glow background */}
            <div
                style={{
                    position: "absolute",
                    width: 800,
                    height: 800,
                    background: `radial-gradient(circle, ${COLORS.purple}22 0%, transparent 70%)`,
                    opacity: pulseOpacity,
                }}
            />

            <FadeIn>
                <div style={{ textAlign: "center" }}>
                    <GlowText size={100}>OBSIDIAN</GlowText>
                    <div style={{ marginTop: 40 }}>
                        <span
                            style={{
                                fontSize: 40,
                                color: COLORS.white,
                                display: "block",
                                marginBottom: 20,
                            }}
                        >
                            Fair. Secure. Private.
                        </span>
                        <span style={{ fontSize: 28, color: COLORS.gray }}>
                            The Future of Token Launches on Solana
                        </span>
                    </div>
                </div>
            </FadeIn>

            {/* CTA / Links */}
            <FadeIn delay={60}>
                <div
                    style={{
                        marginTop: 80,
                        display: "flex",
                        gap: 40,
                        fontSize: 22,
                        color: COLORS.cyan,
                    }}
                >
                    <span>🌐 obsidian-qdke.vercel.app</span>
                    <span>🔗 github.com/miche777</span>
                </div>
            </FadeIn>

            {/* Footer */}
            <div
                style={{
                    position: "absolute",
                    bottom: 40,
                    fontSize: 20,
                    color: COLORS.darkGray,
                }}
            >
                Built for Arcium × Solana Hackathon
            </div>
        </AbsoluteFill>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPOSITION
// ═══════════════════════════════════════════════════════════════════════════════
export const Presentation: React.FC = () => {
    return (
        <AbsoluteFill style={{ fontFamily: "'Inter', 'SF Pro', system-ui, sans-serif" }}>
            {/* Section 1: Intro (0-5s = 0-150) */}
            <Sequence from={0} durationInFrames={150}>
                <IntroSection />
            </Sequence>

            {/* Section 2: Problem (5-20s = 150-600) */}
            <Sequence from={150} durationInFrames={450}>
                <ProblemSection />
            </Sequence>

            {/* Section 3: Solution (20-40s = 600-1200) */}
            <Sequence from={600} durationInFrames={600}>
                <SolutionSection />
            </Sequence>

            {/* Section 4: Architecture (40-70s = 1200-2100) */}
            <Sequence from={1200} durationInFrames={900}>
                <ArchitectureSection />
            </Sequence>

            {/* Section 5: Closing (70-85s = 2100-2550) */}
            <Sequence from={2100} durationInFrames={450}>
                <ClosingSection />
            </Sequence>
        </AbsoluteFill>
    );
};

export default Presentation;
