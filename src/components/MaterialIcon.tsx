type MaterialIconProps = {
  name: string;
  className?: string;
  filled?: boolean;
};

export function MaterialIcon({ name, className = "", filled }: MaterialIconProps) {
  return (
    <span
      className={[
        "material-symbols-outlined",
        className,
        filled ? "material-symbols-outlined--filled" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden
    >
      {name}
    </span>
  );
}
