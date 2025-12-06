/**
 * CompactFamilyCard Component
 * 
 * Displays a family (siblings) in a compact card format for the "All" locations view.
 * Shows: All sibling names, single Security Code, and a single menu for family actions.
 */

import React, { useState, useRef, useEffect } from 'react';
import { CheckInData } from '@/lib/mockData';

interface CompactFamilyCardProps {
  siblings: CheckInData[];
  onCheckOut: (securityCode: string) => void;
  onCheckIn: (securityCode: string) => void;
  onDismiss: (securityCode: string, serviceName?: string) => void;
  onRollOver: (securityCode: string, serviceName?: string) => void;
}

export default function CompactFamilyCard({
  siblings,
  onCheckOut,
  onCheckIn,
  onDismiss,
  onRollOver,
}: CompactFamilyCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // All siblings share the same security code
  const securityCode = siblings[0].securityCode;
  const familyName = siblings[0].familyName;
  // Use the first sibling's service name (siblings in a family card should be from the same service)
  const serviceName = siblings[0].serviceName;
  
  // Check if any sibling is checked out
  const anyCheckedOut = siblings.some(kid => kid.checkedOut);
  const allCheckedOut = siblings.every(kid => kid.checkedOut);

  // Calculate menu position when it opens
  useEffect(() => {
    if (isMenuOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const menuHeight = 120; // Approximate menu height
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      
      // Position below if there's space, otherwise above
      if (spaceBelow >= menuHeight || spaceBelow > spaceAbove) {
        setMenuPosition({
          top: buttonRect.bottom + 4,
          right: window.innerWidth - buttonRect.right,
        });
      } else {
        setMenuPosition({
          top: buttonRect.top - menuHeight - 4,
          right: window.innerWidth - buttonRect.right,
        });
      }
    }
  }, [isMenuOpen]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsMenuOpen(false);
  }

  return (
    <div className="compact-family-card">
      {/* Family Row: Names, Code, and Menu */}
      <div className="card-content">
        <div className="family-names">
          {siblings.map((kid, index) => (
            <span key={kid.id} className="kid-name">
              {kid.childName}
              {index < siblings.length - 1 && <span className="separator">, </span>}
            </span>
          ))}
        </div>
        <div className="security-code">{securityCode}</div>
        
        {/* Menu Button */}
        <div className="menu-container" ref={menuRef}>
          <button
            ref={buttonRef}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="menu-button"
            title="Actions"
          >
            ⋮
          </button>
          
          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div 
              className="menu-dropdown"
              style={{
                top: `${menuPosition.top}px`,
                right: `${menuPosition.right}px`,
              }}
            >
              {!anyCheckedOut ? (
                <>
                  <button onClick={() => handleAction(() => onCheckOut(securityCode))}>
                    ✓ Check Out
                  </button>
                  <button onClick={() => handleAction(() => onRollOver(securityCode, serviceName))}>
                    🔄 Roll Over
                  </button>
                  <button onClick={() => handleAction(() => onDismiss(securityCode, serviceName))}>
                    ⊗ Mark No-Show
                  </button>
                </>
              ) : (
                <button onClick={() => handleAction(() => onCheckIn(securityCode))}>
                  ↩ Undo Check Out
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .compact-family-card {
          background: white;
          border-bottom: 1px solid #e5e7eb;
          padding: 12px;
          transition: all 0.15s ease;
        }

        .compact-family-card:hover {
          background: #f9fafb;
        }

        .compact-family-card:last-child {
          border-bottom: none;
        }

        .card-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .family-names {
          font-size: 15px;
          font-weight: 600;
          color: #1f2937;
          line-height: 1.4;
          flex: 1;
          min-width: 0;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
        }

        .kid-name {
          white-space: nowrap;
        }

        .separator {
          color: #9ca3af;
          font-weight: 400;
        }

        .security-code {
          font-size: 16px;
          font-weight: 700;
          color: #3b82f6;
          letter-spacing: 0.5px;
          padding: 4px 12px;
          background: #eff6ff;
          border-radius: 6px;
          white-space: nowrap;
        }

        .menu-container {
          position: relative;
          margin-left: 4px;
        }

        .menu-button {
          background: transparent;
          border: none;
          color: #6b7280;
          font-size: 18px;
          line-height: 1;
          padding: 2px 4px;
          cursor: pointer;
          transition: all 0.2s;
          border-radius: 4px;
        }

        .menu-button:hover {
          background: #f3f4f6;
          color: #3b82f6;
        }

        .menu-dropdown {
          position: fixed;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          min-width: 160px;
          max-width: 200px;
          overflow: visible;
        }

        .menu-dropdown button {
          display: block;
          width: 100%;
          padding: 10px 14px;
          text-align: left;
          background: white;
          border: none;
          color: #374151;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.15s;
          border-bottom: 1px solid #f3f4f6;
        }

        .menu-dropdown button:last-child {
          border-bottom: none;
        }

        .menu-dropdown button:hover {
          background: #f9fafb;
        }
      `}</style>
    </div>
  );
}

