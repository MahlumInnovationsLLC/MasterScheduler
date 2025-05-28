import React, { useRef, useCallback, forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Focus-preserving wrapper for Input components
export const FocusPreservingInput = forwardRef<
  HTMLInputElement,
  React.ComponentProps<typeof Input>
>(({ onChange, ...props }, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const combinedRef = ref || inputRef;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e);
    }
    // Preserve focus after state update
    setTimeout(() => {
      if (combinedRef && 'current' in combinedRef && combinedRef.current && 
          document.activeElement !== combinedRef.current) {
        combinedRef.current.focus();
      }
    }, 0);
  }, [onChange, combinedRef]);

  return <Input ref={combinedRef} onChange={handleChange} {...props} />;
});

FocusPreservingInput.displayName = "FocusPreservingInput";

// Focus-preserving wrapper for Textarea components
export const FocusPreservingTextarea = forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<typeof Textarea>
>(({ onChange, ...props }, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const combinedRef = ref || textareaRef;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onChange) {
      onChange(e);
    }
    // Preserve focus after state update
    setTimeout(() => {
      if (combinedRef && 'current' in combinedRef && combinedRef.current && 
          document.activeElement !== combinedRef.current) {
        combinedRef.current.focus();
      }
    }, 0);
  }, [onChange, combinedRef]);

  return <Textarea ref={combinedRef} onChange={handleChange} {...props} />;
});

FocusPreservingTextarea.displayName = "FocusPreservingTextarea";

// Focus-preserving wrapper for native textarea elements
export const FocusPreservingNativeTextarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ onChange, ...props }, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const combinedRef = ref || textareaRef;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onChange) {
      onChange(e);
    }
    // Preserve focus after state update
    setTimeout(() => {
      if (combinedRef && 'current' in combinedRef && combinedRef.current && 
          document.activeElement !== combinedRef.current) {
        combinedRef.current.focus();
      }
    }, 0);
  }, [onChange, combinedRef]);

  return <textarea ref={combinedRef} onChange={handleChange} {...props} />;
});

FocusPreservingNativeTextarea.displayName = "FocusPreservingNativeTextarea";