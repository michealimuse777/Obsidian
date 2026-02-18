import { Composition } from "remotion";
import { Presentation } from "./Presentation";

export const RemotionRoot: React.FC = () => {
    return (
        <>
            <Composition
                id="ObsidianDemo"
                component={Presentation}
                durationInFrames={2550} // 85 seconds @ 30fps
                fps={30}
                width={1920}
                height={1080}
            />
        </>
    );
};
