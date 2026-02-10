export default function Input({ 
  label, 
  error, 
  className = '', 
  ...props 
}) {
  return (
    <div className="w-full mb-4">
      {label && (
        <label className="block text-sm font-medium mb-2">
          {label}
        </label>
      )}
      <input
        className={`input ${className}`}
        {...props}
      />
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
}
