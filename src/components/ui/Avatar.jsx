import { initials, hueFrom } from "../../lib/format.js";
import "./Avatar.css";

/**
 * Initial-based avatar. Colour is derived from the name so it is stable
 * across renders and needs no stored image — which also keeps the app
 * free of third-party photo licensing.
 */
function Avatar({ name, size = 36, title }) {
  const hue = hueFrom(name);

  return (
    <span
      className="av"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, size * 0.36),
        background: `hsl(${hue} 52% 92%)`,
        color: `hsl(${hue} 46% 32%)`,
      }}
      title={title ?? name}
      aria-hidden={title === null ? "true" : undefined}
    >
      {initials(name)}
    </span>
  );
}

export default Avatar;
