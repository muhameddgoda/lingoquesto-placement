// frontend/src/components/TextInput.jsx
import React, { forwardRef } from 'react';

const TextInput = forwardRef(({
  value,
  onChange,
  onKeyPress,
  placeholder = "Enter your answer here...",
  disabled = false,
  rows = 4,
  disableSpellCheck = true,
  className = "",
  showCharCount = true,
  maxLength = null,
  ...props
}, ref) => {
  
  const baseClassName = `
    w-full p-6 border-2 border-purple-200 rounded-2xl 
    focus:ring-4 focus:ring-purple-200 focus:border-purple-400 
    resize-none text-lg transition-all duration-200 
    bg-white/50 backdrop-blur-sm
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `;

  const spellCheckProps = disableSpellCheck ? {
    spellCheck: false,
    autoComplete: "off",
    autoCorrect: "off", 
    autoCapitalize: "off",
    'data-gramm': "false",
    'data-gramm_editor': "false",
    'data-enable-grammarly': "false",
  } : {};

  const styles = disableSpellCheck ? {
    WebkitTextDecorationSkip: 'none',
    textDecorationSkipInk: 'none'
  } : {};

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={onChange}
        onKeyPress={onKeyPress}
        placeholder={placeholder}
        className={baseClassName}
        rows={rows}
        disabled={disabled}
        maxLength={maxLength}
        style={styles}
        {...spellCheckProps}
        {...props}
      />
      
      {showCharCount && (
        <div className="absolute bottom-4 right-4 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-full px-3 py-1 border border-purple-200">
          <span className="text-xs font-medium text-purple-700">
            {value.length}{maxLength ? `/${maxLength}` : ''} characters
          </span>
        </div>
      )}
    </div>
  );
});

TextInput.displayName = 'TextInput';

export default TextInput;