import { useState, useRef, KeyboardEvent, forwardRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface TagsInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}

export const TagsInput = forwardRef<HTMLDivElement, TagsInputProps>(
  ({ value = [], onChange, placeholder, className }, ref) => {
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
        e.preventDefault();
        const newTag = inputValue.trim();
        if (!value.includes(newTag)) {
          onChange([...value, newTag]);
        }
        setInputValue('');
      } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
        e.preventDefault();
        const newValue = [...value];
        newValue.pop();
        onChange(newValue);
      }
    };

    const removeTag = (tagToRemove: string) => {
      onChange(value.filter((tag) => tag !== tagToRemove));
    };

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-wrap gap-2 p-2 border rounded-md bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-all",
          className
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="flex items-center gap-1 pr-1 text-sm py-1 px-2 border border-primary/20">
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 bg-transparent outline-none min-w-[120px] text-sm py-1"
        />
      </div>
    );
  }
);

TagsInput.displayName = "TagsInput";
