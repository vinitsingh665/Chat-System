import React from 'react';
import './SearchBar.css';

export default function SearchBar({ value, onChange, onClear, resultCount }) {
  return (
    <div className="search-bar">
      <div className="search-input-wrapper">
        <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        
        <input
          type="text"
          className="search-input"
          placeholder="Search messages..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        
        {value && (
          <button className="search-clear" onClick={onClear} title="Clear search">
            ×
          </button>
        )}
      </div>
      
      {value && (
        <div className="search-results-count">
          {resultCount} {resultCount === 1 ? 'result' : 'results'}
        </div>
      )}
    </div>
  );
}
