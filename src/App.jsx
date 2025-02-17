import React from 'react';
import { round } from 'lodash-es';
import { useEffect, useMemo, useState } from 'react';
import { motion, animate, useTransform, useMotionValue } from 'motion/react';

import { useClass } from './bem';

import './app.css';

export default function App(props) {
  const { rings } = props;

  const [focused, setFocused] = useState(null);
  const [selected, setSelected] = useState(null);
  const [selectedDepth, setSelectedDepth] = useState(0);
  const [sizeType, setSizeType] = useState('gzip');

  const root = rings[0];
  const current = selected || root;
  return (
    <React.Fragment>
      <svg className="chart" viewBox="0 0 100 100">
        {rings.map((node, i) => {
          return (
            <Ring
              key={i}
              node={node}
              depth={i}
              selected={selected}
              selectedDepth={selectedDepth}
              onNodeFocus={(node) => {
                setFocused(node);
              }}
              onNodeBlur={() => {
                setFocused(null);
              }}
              onNodeSelect={(node, depth) => {
                if (selected === node) {
                  setSelected(null);
                  setSelectedDepth(0);
                } else {
                  setSelected(node);
                  setSelectedDepth(depth);
                }
              }}
            />
          );
        })}
        <Bytes type={sizeType} node={focused || current} />
        <BackButton
          onClick={() => {
            if (selectedDepth > 0) {
              setSelected(selected.parent);
              setSelectedDepth(selectedDepth - 1);
            } else {
              setSelected(null);
            }
          }}
        />
      </svg>
      <Bottom
        title={focused?.name || selected?.name || 'Full Build'}
        sizeType={sizeType}
        onSizeTypeClick={(type) => {
          setSizeType(type);
        }}
      />
    </React.Fragment>
  );
}

function BackButton(props) {
  return (
    <circle
      {...props}
      cx="50"
      cy="50"
      r="9"
      fill="none"
      cursor="pointer"
      pointerEvents="all"
    />
  );
}

function Bottom(props) {
  const { title, sizeType, onSizeTypeClick } = props;
  const { className, getElementClass } = useClass('bottom');
  return (
    <div className={className}>
      <div className={getElementClass('title')}>{title}</div>
      <div className={getElementClass('sizes')}>
        <div
          className={getElementClass(
            'size',
            sizeType === 'raw' ? 'active' : null
          )}
          onClick={() => {
            onSizeTypeClick('raw');
          }}
        >
          Raw
        </div>
        <div
          className={getElementClass(
            'size',
            sizeType === 'gzip' ? 'active' : null
          )}
          onClick={() => {
            onSizeTypeClick('gzip');
          }}
        >
          Gzip
        </div>
        <div
          className={getElementClass(
            'size',
            sizeType === 'brotli' ? 'active' : null
          )}
          onClick={() => {
            onSizeTypeClick('brotli');
          }}
        >
          Brotli
        </div>
      </div>
    </div>
  );
}

const UNITS = ['B', 'KB', 'MB', 'GB'];

function formatSize(size) {
  let unit;
  for (let i = UNITS.length - 1; i >= 0; i--) {
    unit = UNITS[i];
    const value = Math.pow(2, i * 10);
    if (size >= value) {
      size = Math.round(size / value);
      break;
    }
  }
  return [size, unit];
}

function getTotal(node, type) {
  if (type === 'gzip') {
    return node.totalGzip;
  } else if (type === 'brotli') {
    return node.totalBrotli;
  } else {
    return node.total;
  }
}

function Bytes(props) {
  const { type, node } = props;

  const [value, unit] = useMemo(() => {
    const size = getTotal(node, type);
    return formatSize(size);
  }, [type, node]);

  return (
    <text
      x="50%"
      y="50%"
      fill="#fff"
      textAnchor="middle"
      fontWeight="100"
      letterSpacing="-0.03em"
      dominantBaseline="middle"
    >
      <tspan x="50%" dy="-0.2em" fontSize="6">
        {value}
      </tspan>
      <tspan x="50%" dy="1.3em" fontSize="4">
        {unit}
      </tspan>
    </text>
  );
}

const RADII = [15, 23, 27.5, 30, 31.5, 33, 34.5, 36, 37.5];
const WIDTHS = [10, 5, 3, 1, 1, 1, 1, 1, 1, 1];

function Ring(props) {
  const {
    node,
    onNodeFocus,
    onNodeBlur,
    selected,
    onNodeSelect,
    depth,
    selectedDepth,
  } = props;
  const { children = [] } = node;

  if (!children.length) {
    return null;
  }

  const radius = RADII[depth - selectedDepth] ?? 7;
  const strokeWidth = WIDTHS[depth - selectedDepth] ?? 5;

  let totalOffset = 0;

  return (
    <g className="package">
      {children.map((child, i) => {
        let amount;

        if (isSelectedChain(child, selected)) {
          amount = child.total / selected.total;
        } else if (selected) {
          amount = 0;
        } else {
          amount = child.total / node.total;
        }

        const offset = totalOffset;

        totalOffset += amount;

        if (child.filler) {
          return;
        }

        child.color ||= getColor(amount, offset);

        return (
          <g key={i} className="segment">
            <Path
              amount={amount}
              offset={offset}
              radius={radius}
              stroke={child.color}
              strokeWidth={strokeWidth}
              onMouseEnter={() => {
                onNodeFocus(child);
              }}
              onMouseLeave={() => {
                onNodeBlur(child);
              }}
              onClick={() => {
                onNodeSelect(child, depth);
              }}
            />
          </g>
        );
      })}
    </g>
  );
}

function getColor(amount, offset) {
  const midpoint = lerp(offset, offset + amount, 0.5);
  const h = Math.floor(lerp(0, 360, midpoint));
  return `hsl(${h} 50% 50%)`;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function isSelectedChain(node, selected) {
  while (node) {
    if (node === selected) {
      return true;
    }
    node = node.parent;
  }
  return false;
}

const ANIMATE_OPTIONS = {
  duration: 0.3,
};

function Path(props) {
  const { amount, offset, radius, strokeWidth, ...rest } = props;

  const animatedAmount = useMotionValue(amount);
  const animatedOffset = useMotionValue(offset);
  const animatedRadius = useMotionValue(radius);
  const animatedWidth = useMotionValue(strokeWidth);

  // Animate to the new amount when it changes
  useEffect(() => {
    animate(animatedAmount, amount, ANIMATE_OPTIONS);
    animate(animatedOffset, offset, ANIMATE_OPTIONS);
    animate(animatedRadius, radius, ANIMATE_OPTIONS);
    animate(animatedWidth, strokeWidth, ANIMATE_OPTIONS);
  }, [amount, offset, radius, strokeWidth]);

  const path = useTransform(
    [animatedAmount, animatedOffset, animatedRadius],
    (values) => {
      return createArcPath(values[0] - 0.001, values[1], values[2]);
    }
  );

  return (
    <motion.path {...rest} d={path} strokeWidth={animatedWidth} fill="none" />
  );
}

function createArcPath(width, offset, radius = 30, centerX = 50, centerY = 50) {
  // Ensure width and offset are within [0, 1]
  width = Math.max(0, Math.min(1, width));
  offset = Math.max(0, Math.min(1, offset));

  const startAngle = offset * 360 - 90; // Start from the top (-90 degrees)
  const sweepAngle = width * 360;

  const endAngle = startAngle + sweepAngle;

  const start = polarToCartesian(centerX, centerY, radius, startAngle);
  const end = polarToCartesian(centerX, centerY, radius, endAngle);

  // Large arc flag (1 if the sweep angle is >= 180 degrees)
  const largeArcFlag = sweepAngle > 180 ? 1 : 0;

  // SVG path for the arc
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

// Convert polar coordinates to Cartesian
const polarToCartesian = (cx, cy, r, deg) => {
  const rad = (deg * Math.PI) / 180;
  return {
    x: round(cx + r * Math.cos(rad), 3),
    y: round(cy + r * Math.sin(rad), 3),
  };
};
