import React, { useEffect, useRef, useState } from "react";

const TagsInput = ({
  label,
  placeholder,
  tags,
  onAdd,
  onRemove,
  disabled
}) => {
  const [value, setValue] = useState("");
  const inputRef = useRef(null);
  const pendingFocusRef = useRef(false);

  const scheduleFocus = () => {
    pendingFocusRef.current = true;
  };

  const commitTag = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (tags.includes(trimmed)) {
      setValue("");
      scheduleFocus();
      return;
    }
    onAdd(trimmed);
    setValue("");
    scheduleFocus();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitTag();
      return;
    }
    if (event.key === "Backspace" && !value && tags.length) {
      event.preventDefault();
      onRemove(tags[tags.length - 1]);
      scheduleFocus();
    }
  };

  const handleBlur = () => {
    commitTag();
  };

  useEffect(() => {
    if (!pendingFocusRef.current) return;
    let cancelled = false;

    const tryFocus = () => {
      if (cancelled) return;
      if (inputRef.current && !disabled) {
        inputRef.current.focus();
        pendingFocusRef.current = false;
        return;
      }
      setTimeout(tryFocus, 50);
    };

    tryFocus();
    return () => {
      cancelled = true;
    };
  }, [disabled, tags.length]);

  return (
    <div className="stack">
      {label ? <label>{label}</label> : null}
      <div className={`tags-input ${disabled ? "disabled" : ""}`}>
        {tags.map((tag) => (
          <button
            type="button"
            key={tag}
            className="tag"
            onClick={() => {
              onRemove(tag);
              scheduleFocus();
            }}
            disabled={disabled}
            aria-label={`Remove ${tag}`}
          >
            <span>{tag}</span>
            <i className="fa-solid fa-xmark" />
          </button>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export default TagsInput;
