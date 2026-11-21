import React from 'react';

/**
 * Official Ploy.pe Brand Logo Component
 * Matches the official identity specification:
 * - Icon Mark: Arch portal with amber/gold avatar or mint emerald emblem
 * - Wordmark: "ploy.pe" with signature amber gold dot (#F2B84B)
 * - Sub-brand: "by NH Associates"
 */
export default function BrandLogo({
  variant = 'full', // 'full' | 'icon' | 'lockup'
  mode = 'auto',    // 'auto' | 'light' | 'dark'
  size = 32,
  withSub = true,
  withBadge = false,
  badgeText = 'HR & PAYROLL',
  className = '',
  style = {},
}) {
  const isDark = mode === 'dark';
  const textColor = isDark ? '#FFFFFF' : '#0F2E24';
  const dotColor = '#F2B84B';

  // Icon Mark Component (Geometric SVG matching specification)
  const IconMark = ({ h = size }) => {
    const w = (h * 68) / 79;
    return (
      <svg
        width={w}
        height={h}
        viewBox="0 0 68 79"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0, display: 'block' }}
      >
        {isDark ? (
          // Dark mode: Crisp White Arch with clean cutouts
          <path
            fill="#FFFFFF"
            fillRule="evenodd"
            clipRule="evenodd"
            d="
              M 34 0
              C 52.778 0 68 15.222 68 34
              V 79
              H 49.5
              C 49.5 70.4 42.6 63.5 34 63.5
              C 25.4 63.5 18.5 70.4 18.5 79
              H 0
              V 34
              C 0 15.222 15.222 0 34 0
              Z
              M 34 22
              A 11 11 0 1 0 34 44
              A 11 11 0 1 0 34 22
              Z
            "
          />
        ) : (
          // Light mode: Forest Green Arch (#0F2E24) + Amber Avatar (#F2B84B)
          <g>
            <path
              d="
                M 34 0
                C 52.778 0 68 15.222 68 34
                V 79
                H 0
                V 34
                C 0 15.222 15.222 0 34 0
                Z
              "
              fill="#0F2E24"
            />
            {/* Amber Human Avatar inside Arch */}
            <circle cx="34" cy="33" r="10.5" fill="#F2B84B" />
            <path
              d="
                M 12 79
                C 12 66.85 21.85 57 34 57
                C 46.15 57 56 66.85 56 79
                H 12
                Z
              "
              fill="#F2B84B"
            />
          </g>
        )}
      </svg>
    );
  };

  // Squircle Favicon Badge Icon (Mint Emerald #3DD598 on Deep Green #0F2E24)
  const SquircleIcon = ({ h = size }) => {
    return (
      <svg
        width={h}
        height={h}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0, borderRadius: Math.round(h * 0.25), overflow: 'hidden' }}
      >
        <rect width="64" height="64" rx="16" fill="#0F2E24" />
        <path
          fill="#3DD598"
          fillRule="evenodd"
          clipRule="evenodd"
          d="
            M 32 12.5
            C 40.5 12.5 47 19 47 27.5
            L 47 51
            L 40.5 51
            C 40.5 45.5 36.7 42.5 32 42.5
            C 27.3 42.5 23.5 45.5 23.5 51
            L 17 51
            L 17 27.5
            C 17 19 23.5 12.5 32 12.5
            Z
            M 32 26.5
            A 5 5 0 1 0 32 36.5
            A 5 5 0 1 0 32 26.5
            Z
          "
        />
      </svg>
    );
  };

  if (variant === 'icon') {
    return <IconMark h={size} />;
  }

  if (variant === 'squircle') {
    return <SquircleIcon h={size} />;
  }

  const fontSize = Math.round(size * 0.68);

  return (
    <div
      className={`brand-logo-lockup ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: Math.round(size * 0.32),
        textDecoration: 'none',
        lineHeight: 1,
        ...style,
      }}
    >
      <IconMark h={size} />

      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 2,
            fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
            fontSize: `${fontSize}px`,
            fontWeight: 900,
            letterSpacing: '-0.035em',
            color: textColor,
          }}
        >
          <span>ploy</span>
          <span style={{ color: dotColor, fontSize: `${fontSize * 1.25}px`, lineHeight: 0.5 }}>.</span>
          <span>pe</span>

          {withBadge && (
            <span
              style={{
                marginLeft: 8,
                fontSize: `${Math.max(9, Math.round(fontSize * 0.44))}px`,
                fontWeight: 800,
                letterSpacing: '0.04em',
                padding: '2px 6px',
                borderRadius: 5,
                backgroundColor: isDark ? 'rgba(61, 213, 152, 0.15)' : '#E6F4EA',
                color: isDark ? '#3DD598' : '#0F2E24',
                verticalAlign: 'middle',
              }}
            >
              {badgeText}
            </span>
          )}
        </div>

        {withSub && (
          <div
            style={{
              fontSize: `${Math.max(9.5, Math.round(fontSize * 0.45))}px`,
              fontWeight: 600,
              color: isDark ? '#94A3B8' : '#64748B',
              letterSpacing: '0.04em',
              marginTop: 3,
            }}
          >
            by NH Associates
          </div>
        )}
      </div>
    </div>
  );
}
