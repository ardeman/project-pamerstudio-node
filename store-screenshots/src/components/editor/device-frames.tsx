"use client";
import * as React from "react";
import { type DuoDevice } from "@/lib/devices";
import { FRAME_ASPECT, MAC_TITLE_BAR, MOCKUP_SRC, PHONE_SCREEN, bezelGeometry, captureFits, fillsFromTop } from "@/lib/frame-assets";
import type { Device, Orientation } from "@/lib/types";
import { img, imgSize } from "@/lib/image-cache";

type FrameProps = {
  src: string;
  style?: React.CSSProperties;
  /** When true, hide EmptySlot placeholder (so it doesn't bake into exports). */
  hideEmpty?: boolean;
  /**
   * Rotate only the bezel chrome (camera corner). Screenshot content stays upright.
   * 180 = closed-turned phone held the other way around.
   */
  bezelRotation?: number;
};

type FrameComponent = React.ComponentType<FrameProps>;

function Phone({ src, style, hideEmpty }: FrameProps) {
  const resolved = img(src);
  return (
    <div style={{ position: "relative", aspectRatio: FRAME_ASPECT.iphone, ...style }}>
      {/* The screen layer covers the bezel's centre, so the exporter checks the
          whole mockup (its visible bezel) rather than its hidden middle. */}
      <img
        src={img(MOCKUP_SRC)}
        alt=""
        data-export-check="full"
        style={{ display: "block", width: "100%", height: "100%" }}
        draggable={false}
      />
      <div
        style={{
          position: "absolute",
          zIndex: 10,
          overflow: "hidden",
          left: `${PHONE_SCREEN.L}%`,
          top: `${PHONE_SCREEN.T}%`,
          width: `${PHONE_SCREEN.W}%`,
          height: `${PHONE_SCREEN.H}%`,
          borderRadius: `${PHONE_SCREEN.RX}% / ${PHONE_SCREEN.RY}%`,
          background: "#111",
        }}
      >
        {resolved ? (
          <img
            src={resolved}
            alt=""
            style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
            draggable={false}
          />
        ) : hideEmpty ? null : (
          <EmptySlot />
        )}
      </div>
    </div>
  );
}

function AndroidPhone({ src, style, hideEmpty }: FrameProps) {
  const resolved = img(src);
  return (
    <div style={{ position: "relative", aspectRatio: FRAME_ASPECT.android, ...style }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "8% / 4%",
          background: "linear-gradient(160deg, #2a2a2e 0%, #18181b 100%)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08), 0 8px 40px rgba(0,0,0,0.55)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "1.5%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "3%",
            height: "1.4%",
            borderRadius: "50%",
            background: "#0d0d0f",
            border: "1px solid rgba(255,255,255,0.06)",
            zIndex: 20,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "3.5%",
            top: "2%",
            width: "93%",
            height: "96%",
            borderRadius: "5.5% / 2.6%",
            overflow: "hidden",
            background: "#000",
          }}
        >
          {resolved ? (
            <img
              src={resolved}
              alt=""
              style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
              draggable={false}
            />
          ) : hideEmpty ? null : (
            <EmptySlot />
          )}
        </div>
      </div>
    </div>
  );
}

function AndroidTabletP({ src, style, hideEmpty }: FrameProps) {
  const resolved = img(src);
  return (
    <div style={{ position: "relative", aspectRatio: FRAME_ASPECT.tabletPortrait, ...style }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "4.5% / 2.8%",
          background: "linear-gradient(160deg, #2a2a2e 0%, #18181b 100%)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08), 0 8px 48px rgba(0,0,0,0.6)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "1.2%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "1.4%",
            height: "0.88%",
            borderRadius: "50%",
            background: "#0d0d0f",
            zIndex: 20,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "3.5%",
            top: "2.2%",
            width: "93%",
            height: "95.6%",
            borderRadius: "2.5% / 1.6%",
            overflow: "hidden",
            background: "#000",
          }}
        >
          {resolved ? (
            <img
              src={resolved}
              alt=""
              style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
              draggable={false}
            />
          ) : hideEmpty ? null : (
            <EmptySlot />
          )}
        </div>
      </div>
    </div>
  );
}

function AndroidTabletL({ src, style, hideEmpty }: FrameProps) {
  const resolved = img(src);
  return (
    <div style={{ position: "relative", aspectRatio: FRAME_ASPECT.tabletLandscape, ...style }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "2.8% / 4.5%",
          background: "linear-gradient(160deg, #2a2a2e 0%, #18181b 100%)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08), 0 8px 48px rgba(0,0,0,0.6)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "1.2%",
            top: "50%",
            transform: "translateY(-50%)",
            width: "0.88%",
            height: "1.4%",
            borderRadius: "50%",
            background: "#0d0d0f",
            zIndex: 20,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "2.2%",
            top: "3.5%",
            width: "95.6%",
            height: "93%",
            borderRadius: "1.6% / 2.5%",
            overflow: "hidden",
            background: "#000",
          }}
        >
          {resolved ? (
            <img
              src={resolved}
              alt=""
              style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
              draggable={false}
            />
          ) : hideEmpty ? null : (
            <EmptySlot />
          )}
        </div>
      </div>
    </div>
  );
}

// Mac window: title bar + a content area that is exactly 16:10, the Mac App
// Store's own aspect, so a full-screen or 16:10 capture fills it uncropped.
function MacWindow({ src, style, hideEmpty }: FrameProps) {
  const resolved = img(src);
  const titleBar = `${(MAC_TITLE_BAR / (1 + MAC_TITLE_BAR)) * 100}%`;
  const light = (color: string) => (
    <span
      style={{
        width: "1.1%",
        aspectRatio: "1",
        borderRadius: "50%",
        background: color,
        boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.25)",
        flexShrink: 0,
      }}
    />
  );
  return (
    <div style={{ position: "relative", aspectRatio: FRAME_ASPECT.mac, ...style }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          // Circular corners: the vertical radius is scaled by the frame aspect.
          borderRadius: `1.1% / ${1.1 * FRAME_ASPECT.mac}%`,
          background: "#1C1C1E",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12), 0 18px 60px rgba(0,0,0,0.40)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            height: titleBar,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            gap: "0.75%",
            padding: "0 1.3%",
            background: "linear-gradient(180deg, #3D3D40 0%, #323235 100%)",
            boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.35)",
            flexShrink: 0,
          }}
        >
          {light("#FF5F57")}
          {light("#FEBC2E")}
          {light("#28C840")}
        </div>
        <div style={{ flex: 1, overflow: "hidden", background: "#111", minHeight: 0 }}>
          {resolved ? (
            <img
              src={resolved}
              alt=""
              style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
              draggable={false}
            />
          ) : hideEmpty ? null : (
            <EmptySlot />
          )}
        </div>
      </div>
    </div>
  );
}

function IPad({ src, style, hideEmpty, landscape = false }: FrameProps & { landscape?: boolean }) {
  const resolved = img(src);
  const aspect = landscape ? 1 / FRAME_ASPECT.ipad : FRAME_ASPECT.ipad;
  // Portrait: camera centred on the short top edge. Landscape: same bezel turned
  // so the camera sits on the short leading edge (matches a rotated iPad capture).
  const camera = landscape
    ? { top: "50%", left: "1.2%", transform: "translateY(-50%)", width: "0.65%", height: "0.9%" }
    : { top: "1.2%", left: "50%", transform: "translateX(-50%)", width: "0.9%", height: "0.65%" };
  return (
    <div style={{ position: "relative", aspectRatio: aspect, ...style }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: landscape ? "3.6% / 5%" : "5% / 3.6%",
          background: "linear-gradient(180deg, #2C2C2E 0%, #1C1C1E 100%)",
          position: "relative",
          overflow: "hidden",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1), 0 8px 40px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: camera.top,
            left: camera.left,
            transform: camera.transform,
            width: camera.width,
            height: camera.height,
            borderRadius: "50%",
            background: "#111113",
            zIndex: 20,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: landscape ? "2.8%" : "4%",
            top: landscape ? "4%" : "2.8%",
            width: landscape ? "94.4%" : "92%",
            height: landscape ? "92%" : "94.4%",
            borderRadius: landscape ? "1.6% / 2.2%" : "2.2% / 1.6%",
            overflow: "hidden",
            background: "#000",
          }}
        >
          {resolved ? (
            <img
              src={resolved}
              alt=""
              style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
              draggable={false}
            />
          ) : hideEmpty ? null : (
            <EmptySlot />
          )}
        </div>
      </div>
    </div>
  );
}

// Geometry comes from Apple's bezel in public/frames/ (measured by
// /api/frames) or, without one, a drawn frame whose screen has the capture's
// exact aspect. The frame fits itself inside whatever box it is given, so a
// placement saved with a different bezel never stretches it.

/** After a 180° bezel flip, TL↔BR and TR↔BL so the capture's clip still matches the hole. */
function flipCornerClip(clip: string | undefined): string | undefined {
  if (!clip) return clip;
  const [xsPart, ysPart] = clip.split("/").map((s) => s.trim());
  const xs = xsPart?.split(/\s+/);
  const ys = ysPart?.split(/\s+/);
  if (!xs || xs.length !== 4 || !ys || ys.length !== 4) return clip;
  return `${xs[2]} ${xs[3]} ${xs[0]} ${xs[1]} / ${ys[2]} ${ys[3]} ${ys[0]} ${ys[1]}`;
}

// A device drawn under Apple's bezel (or, for iPhone Duo without one, a drawn
// stand-in). A capture that doesn't fit the screen is letterboxed, unless the
// device fills from the top (see fillsFromTop).
function BezelFrame({
  device,
  orientation = "portrait",
  src,
  style,
  hideEmpty,
  bezelRotation = 0,
}: FrameProps & { device: Device; orientation?: Orientation }) {
  const g = bezelGeometry(device, orientation);
  if (!g) return null;
  const resolved = img(src);
  // Flip only the chrome (shell + camera). Screenshot stays upright, but must
  // move with the cutout — a 180° bezel rotate moves the hole; leaving the
  // screen rect put cropped the capture against the opposite edge.
  const flip = ((bezelRotation % 360) + 360) % 360 === 180;
  const screen = flip
    ? {
        L: 100 - g.screen.L - g.screen.W,
        T: 100 - g.screen.T - g.screen.H,
        W: g.screen.W,
        H: g.screen.H,
      }
    : g.screen;
  const screenClip = flip ? flipCornerClip(g.clip) : g.clip;
  const frameRadius = `${(g.radius.x * screen.W) / 100 + screen.L}% / ${(g.radius.y * screen.H) / 100 + screen.T}%`;
  const landscape = g.screenAspect > 1;
  // Base: landscape → top-left camera; portrait → top-right. Flip → opposite corner.
  const cameraPos = landscape
    ? flip
      ? { right: "3.4cqmin", bottom: "3.4cqmin" }
      : { left: "3.4cqmin", top: "3.4cqmin" }
    : flip
      ? { left: "3.4cqmin", bottom: "3.4cqmin" }
      : { right: "3.4cqmin", top: "3.4cqmin" };
  return (
    <div
      style={{
        position: "relative",
        aspectRatio: `${g.aspect}`,
        ...style,
        containerType: "size",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ position: "relative", width: `min(100cqw, calc(100cqh * ${g.aspect}))`, aspectRatio: `${g.aspect}` }}>
        {!g.image && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: frameRadius,
              background: "linear-gradient(160deg, #3a3a3e 0%, #1b1b1e 45%, #2a2a2e 100%)",
              boxShadow:
                "inset 0 0 0 1px rgba(255,255,255,0.14), inset 0 0 0 3px rgba(0,0,0,0.5), 0 10px 44px rgba(0,0,0,0.45)",
              transform: flip ? "rotate(180deg)" : undefined,
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            left: `${screen.L}%`,
            top: `${screen.T}%`,
            width: `${screen.W}%`,
            height: `${screen.H}%`,
            // Real Apple bezels mask the cutout (Duo outer is square on the hinge
            // side). CSS radii here fought that — after a 180° chrome flip the
            // round clip sat on the sharp hinge corner and left a peach gap.
            // Drawn stand-ins still need a clip.
            borderRadius: g.image ? undefined : (screenClip ?? `${g.radius.x}% / ${g.radius.y}%`),
            overflow: "hidden",
            background: "#000",
            containerType: "size",
          }}
        >
          {resolved ? (
            <img
              src={resolved}
              alt=""
              style={{
                display: "block",
                width: "100%",
                height: "100%",
                objectFit:
                  fillsFromTop(device) ||
                  device === "ipad" ||
                  captureFits(imgSize(src), g.screenAspect, device)
                    ? "cover"
                    : "contain",
                objectPosition: fillsFromTop(device) ? "top" : "center",
              }}
              draggable={false}
            />
          ) : hideEmpty ? null : (
            <EmptySlot />
          )}
        </div>
        {!g.image && g.camera === "corner" && (
          // On the bezel layer (outside the screenshot) so a 180° chrome flip
          // moves the camera without turning the capture upside down.
          <div
            aria-hidden
            style={{
              position: "absolute",
              ...cameraPos,
              width: "5.6cqmin",
              height: "5.6cqmin",
              background: "#050506",
              borderRadius: 999,
              pointerEvents: "none",
              margin: "2.2%",
            }}
          />
        )}
        {g.image && (
          // The real bezel sits over the screen; its transparent cutout shows it.
          <img
            src={img(g.image.src)}
            alt=""
            data-export-check="full"
            draggable={false}
            style={
              g.image.rotate
                ? {
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: `${100 / g.aspect}%`,
                    height: `${100 * g.aspect}%`,
                    transform: `translate(-50%, -50%) rotate(-90deg)${flip ? " rotate(180deg)" : ""}`,
                    pointerEvents: "none",
                  }
                : {
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    transform: flip ? "rotate(180deg)" : undefined,
                    pointerEvents: "none",
                  }
            }
          />
        )}
      </div>
    </div>
  );
}

// One stable component per target, so switching decks doesn't remount frames.
const DUO_FRAMES: Record<DuoDevice, FrameComponent> = {
  "duo-outer": (props) => <BezelFrame device="duo-outer" {...props} />,
  "duo-outer-landscape": (props) => <BezelFrame device="duo-outer-landscape" {...props} />,
  "duo-inner": (props) => <BezelFrame device="duo-inner" {...props} />,
  "duo-inner-landscape": (props) => <BezelFrame device="duo-inner-landscape" {...props} />,
};

const bezelFrames = new Map<string, FrameComponent>();

function bezelFrameFor(device: Device, orientation: Orientation): FrameComponent {
  const key = `${device}:${orientation}`;
  let frame = bezelFrames.get(key);
  if (!frame) {
    const Component = (props: FrameProps) => <BezelFrame device={device} orientation={orientation} {...props} />;
    Component.displayName = `BezelFrame(${device},${orientation})`;
    frame = Component;
    bezelFrames.set(key, frame);
  }
  return frame;
}

const TABLET_FRAMES: Record<Orientation, FrameComponent> = { portrait: AndroidTabletP, landscape: AndroidTabletL };

/** Built-in frame of each device; sizes and aspects come from lib/frame-assets.ts. */
function AndroidPhoneL(props: FrameProps) {
  // Same shell as AndroidPhone, turned for landscape games. Punch-hole sits on
  // the left short edge so it lines up with landscape captures that pad that side
  // (same side as the iPhone Dynamic Island in our store shots).
  const resolved = img(props.src);
  return (
    <div style={{ position: "relative", aspectRatio: FRAME_ASPECT.androidLandscape, ...props.style }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "6% / 12%",
          background: "linear-gradient(160deg, #2a2a2e 0%, #111 55%, #1c1c1f 100%)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12), 0 12px 40px rgba(0,0,0,0.35)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "3%",
          top: "4%",
          width: "94%",
          height: "92%",
          borderRadius: "4% / 8%",
          overflow: "hidden",
          background: "#000",
        }}
      >
        {resolved ? (
          <img
            src={resolved}
            alt=""
            style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
            draggable={false}
          />
        ) : props.hideEmpty ? null : (
          <EmptySlot />
        )}
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: "1.2%",
            top: "50%",
            transform: "translateY(-50%)",
            width: "1.6%",
            height: "3.2%",
            borderRadius: "50%",
            background: "#0d0d0f",
            border: "1px solid rgba(255,255,255,0.06)",
            zIndex: 20,
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}

const PHONE_FRAMES: Record<Orientation, FrameComponent> = { portrait: Phone, landscape: Phone /* bezel path preferred */ };
const ANDROID_FRAMES: Record<Orientation, FrameComponent> = { portrait: AndroidPhone, landscape: AndroidPhoneL };

const IPAD_FRAMES: Record<Orientation, FrameComponent> = {
  portrait: IPad,
  landscape: (props) => <IPad {...props} landscape />,
};

const BUILT_IN_FRAMES: Record<Exclude<Device, DuoDevice>, FrameComponent | Record<Orientation, FrameComponent>> = {
  iphone: PHONE_FRAMES,
  ipad: IPAD_FRAMES,
  tvos: AppleTV,
  watchos: AppleWatch,
  carplay: CarPlayScreen,
  mac: MacWindow,
  android: ANDROID_FRAMES,
  "android-7": TABLET_FRAMES,
  "android-10": TABLET_FRAMES,
  // The Play Store banner draws no device.
  "feature-graphic": Phone,
  "creative-universal": Phone,
  "creative-header": Phone,
  "creative-search": Phone,
};

/** The frame component that draws `device`: its Apple bezel when measured, otherwise its built-in frame. */
export function frameComponent(device: Device, orientation: Orientation): FrameComponent {
  if (device in DUO_FRAMES) return DUO_FRAMES[device as DuoDevice];
  if (bezelGeometry(device, orientation)) return bezelFrameFor(device, orientation);
  const frame = BUILT_IN_FRAMES[device as Exclude<Device, DuoDevice>];
  return typeof frame === "function" ? frame : frame[orientation];
}

function EmptySlot() {
  // Sized off the slot's own width (container query units) so the hint stays
  // readable on a 4K TV canvas and still fits inside a 422 px watch face.
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        containerType: "inline-size",
        background: "linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.4)",
          fontSize: "6cqw",
          textAlign: "center",
          padding: "8%",
          boxSizing: "border-box",
        }}
      >
        Drop a screenshot here
      </div>
    </div>
  );
}

// The screenshot IS the content, so there is no device UI to draw. A thin dark
// bezel reads as "TV" without competing with the capture.
function AppleTV({ src, style, hideEmpty }: FrameProps) {
  const resolved = img(src);
  return (
    <div style={{ position: "relative", aspectRatio: FRAME_ASPECT.tv, ...style }}>
      <div
        style={{
          width: "100%", height: "100%",
          borderRadius: "1.1% / 2.0%",
          background: "#0A0A0C",
          padding: "0.9%",
          boxSizing: "border-box",
          boxShadow: "0 22px 70px rgba(0,0,0,0.40), inset 0 0 0 1px rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        <div style={{ width: "100%", height: "100%", overflow: "hidden", background: "#111",
                      borderRadius: "0.5% / 0.9%" }}>
          {resolved ? (
            <img src={resolved} alt="" draggable={false}
                 style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
          ) : hideEmpty ? null : (<EmptySlot />)}
        </div>
      </div>
    </div>
  );
}

// Cushion-shaped body with a very large corner radius, plus the digital crown and
// side button on the right. The bezel is proportionally much thicker than a phone's,
// which is what makes a watch read as a watch at small sizes.
function AppleWatch({ src, style, hideEmpty }: FrameProps) {
  const resolved = img(src);
  return (
    <div style={{ position: "relative", aspectRatio: FRAME_ASPECT.watch, ...style }}>
      {/* crown + side button */}
      <div style={{ position: "absolute", right: "-2.6%", top: "27%", width: "3.4%", height: "12%",
                    background: "linear-gradient(180deg,#8E8E93,#5A5A5E)", borderRadius: "40%" }} />
      <div style={{ position: "absolute", right: "-1.8%", top: "45%", width: "2.4%", height: "14%",
                    background: "linear-gradient(180deg,#6E6E73,#48484A)", borderRadius: "40%" }} />
      <div
        style={{
          width: "100%", height: "100%",
          borderRadius: "26% / 21%",
          background: "#0A0A0C",
          padding: "6.5%",
          boxSizing: "border-box",
          boxShadow: "0 18px 50px rgba(0,0,0,0.42), inset 0 0 0 1px rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}
      >
        <div style={{ width: "100%", height: "100%", overflow: "hidden", background: "#000",
                      borderRadius: "22% / 18%" }}>
          {resolved ? (
            <img src={resolved} alt="" draggable={false}
                 style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
          ) : hideEmpty ? null : (<EmptySlot />)}
        </div>
      </div>
    </div>
  );
}

// A dashboard head unit: wide, squared-off, minimal bezel. Deliberately plainer than
// the TV frame because CarPlay screens are set into a fascia rather than being a
// product silhouette anyone recognises.
function CarPlayScreen({ src, style, hideEmpty }: FrameProps) {
  const resolved = img(src);
  return (
    <div style={{ position: "relative", aspectRatio: FRAME_ASPECT.carplay, ...style }}>
      <div
        style={{
          width: "100%", height: "100%",
          borderRadius: "2.2% / 3.6%",
          background: "#0B0B0D",
          padding: "1.6%",
          boxSizing: "border-box",
          boxShadow: "0 20px 60px rgba(0,0,0,0.40), inset 0 0 0 1px rgba(255,255,255,0.07)",
          overflow: "hidden",
        }}
      >
        <div style={{ width: "100%", height: "100%", overflow: "hidden", background: "#000",
                      borderRadius: "1.4% / 2.3%" }}>
          {resolved ? (
            <img src={resolved} alt="" draggable={false}
                 style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
          ) : hideEmpty ? null : (<EmptySlot />)}
        </div>
      </div>
    </div>
  );
}
