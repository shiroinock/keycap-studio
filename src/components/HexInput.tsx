import { useEffect, useState } from "react";
export default function HexInput({
  value,
  label,
  onChange,
}: {
  value: string;
  label: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <input
      className="hex-input"
      aria-label={label}
      aria-invalid={!/^#[0-9a-fA-F]{6}$/.test(draft)}
      value={draft}
      maxLength={7}
      spellCheck={false}
      onChange={(e) => {
        setDraft(e.target.value);
        if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(e.target.value);
      }}
      onBlur={() => setDraft(value)}
    />
  );
}
