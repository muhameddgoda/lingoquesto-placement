// frontend/src/components/TextInput.jsx - Consistent styling
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
    w-full p-4 border-2 border-gray-200 rounded-lg 
    focus:ring-2 focus:ring-blue-200 focus:border-blue-400 
    resize-none text-base transition-all duration-200 
    bg-white
    ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}
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
        <div className="absolute bottom-3 right-3 bg-gray-100 rounded-md px-2 py-1 border border-gray-200">
          <span className="text-xs font-medium text-gray-600">
            {value.length}{maxLength ? `/${maxLength}` : ''} characters
          </span>
        </div>
      )}
    </div>
  );
});

TextInput.displayName = 'TextInput';

export default TextInput;