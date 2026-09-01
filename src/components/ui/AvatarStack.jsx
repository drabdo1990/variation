import Avatar from "./Avatar.jsx";

/**
 * Overlapping avatars with a "+N" chip once the list exceeds `max`.
 * The full roster is exposed to assistive tech as a single label.
 */
function AvatarStack({ people = [], max = 3, size = 30 }) {
  const shown = people.slice(0, max);
  const overflow = people.length - shown.length;
  const roster = people.map((p) => p.name).join(", ");

  return (
    <span className="av-stack" role="img" aria-label={roster}>
      {shown.map((person) => (
        <Avatar key={person.id} name={person.name} size={size} title={null} />
      ))}
      {overflow > 0 && (
        <span
          className="av-more"
          style={{
            width: size,
            height: size,
            fontSize: Math.max(10, size * 0.34),
          }}
        >
          +{overflow}
        </span>
      )}
    </span>
  );
}

export default AvatarStack;
