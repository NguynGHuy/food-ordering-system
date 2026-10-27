import { useState, useRef, useEffect } from "react";

export interface ChartDataPoint {
  label: string; // e.g. "27/10"
  fullDate: string; // e.g. "27/10/2026"
  value1: number; // e.g. Gross order value
  value2?: number; // e.g. Platform fee or Merchant net income
  count?: number; // Order count
}

interface RevenueAreaChartProps {
  data: ChartDataPoint[];
  series1Name: string;
  series2Name?: string;
  series1Color?: string;
  series2Color?: string;
  height?: number;
  emptyMessage?: string;
}

function formatVnd(val: number): string {
  return `${Number(val || 0).toLocaleString("vi-VN")} đ`;
}

function formatCompact(val: number): string {
  if (val <= 0) return "0";
  if (val >= 1_000_000_000) {
    const b = val / 1_000_000_000;
    return `${Number(b.toFixed(1))}B`;
  }
  if (val >= 1_000_000) {
    const m = val / 1_000_000;
    return `${Number(m.toFixed(1))}tr`;
  }
  if (val >= 1_000) {
    const k = val / 1_000;
    return `${Number(k.toFixed(0))}k`;
  }
  return `${val}`;
}

// Compute nice round Y-axis scale with clean intervals
function getNiceYScale(rawMax: number) {
  const minCap = 100_000;
  const max = Math.max(rawMax, minCap);

  let step: number;
  if (max <= 100_000) step = 50_000;
  else if (max <= 200_000) step = 100_000;
  else if (max <= 500_000) step = 250_000;
  else if (max <= 1_000_000) step = 500_000;
  else if (max <= 2_000_000) step = 1_000_000;
  else if (max <= 5_000_000) step = 2_500_000;
  else {
    const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
    const normalized = max / magnitude;
    if (normalized <= 2) step = 0.5 * magnitude;
    else if (normalized <= 5) step = 1 * magnitude;
    else step = 2 * magnitude;
  }

  const yMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let val = 0; val <= yMax; val += step) {
    ticks.push(val);
  }

  return { yMax, ticks };
}

export default function RevenueAreaChart({
  data,
  series1Name,
  series2Name,
  series1Color = "#f4511e",
  series2Color = "#10b981",
  height = 240,
  emptyMessage = "Chưa có phát sinh đơn hoàn thành trong kỳ này.",
}: RevenueAreaChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [svgWidth, setSvgWidth] = useState<number>(700);
  const containerRef = useRef<HTMLDivElement>(null);

  // ResizeObserver to ensure SVG coordinate space matches real container pixels 1:1
  // This eliminates any horizontal text stretching or distortion!
  useEffect(() => {
    if (!containerRef.current) return;

    const elem = containerRef.current;
    const initialWidth = elem.clientWidth;
    if (initialWidth > 0) {
      setSvgWidth(initialWidth);
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = Math.round(entry.contentRect.width);
        if (width > 0) {
          setSvgWidth(width);
        }
      }
    });

    observer.observe(elem);
    return () => observer.disconnect();
  }, []);

  const hasData = data?.some(
    (item) => item.value1 !== 0 || (item.value2 ?? 0) !== 0 || (item.count ?? 0) !== 0,
  );

  if (!data || data.length === 0 || !hasData) {
    return (
      <div className="revenue-chart-empty" style={{ height }}>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  // Calculate clean Y scale
  const rawMax = Math.max(
    ...data.map((d) => Math.max(d.value1, d.value2 ?? 0)),
    0,
  );
  const { yMax, ticks: yTicks } = getNiceYScale(rawMax);

  const paddingLeft = 52;
  const paddingRight = 18;
  const paddingTop = 16;
  const paddingBottom = 28;

  const chartWidth = Math.max(svgWidth - paddingLeft - paddingRight, 100);
  const chartHeight = Math.max(height - paddingTop - paddingBottom, 60);

  const pointsCount = data.length;
  const xStep = pointsCount > 1 ? chartWidth / (pointsCount - 1) : chartWidth / 2;

  const getX = (idx: number) => {
    return paddingLeft + (pointsCount > 1 ? idx * xStep : chartWidth / 2);
  };

  const getY = (val: number) => {
    const ratio = Math.min(Math.max(val / yMax, 0), 1);
    return paddingTop + chartHeight - ratio * chartHeight;
  };

  // Build SVG Path
  const buildPath = (values: number[]) => {
    if (values.length === 0) return "";
    return values
      .map((val, idx) => {
        const x = getX(idx);
        const y = getY(val);
        return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  };

  const buildAreaPath = (values: number[]) => {
    if (values.length === 0) return "";
    const linePath = buildPath(values);
    const lastX = getX(values.length - 1);
    const firstX = getX(0);
    const bottomY = paddingTop + chartHeight;
    return `${linePath} L ${lastX.toFixed(1)} ${bottomY} L ${firstX.toFixed(1)} ${bottomY} Z`;
  };

  const series1Values = data.map((d) => d.value1);
  const series2Values = series2Name ? data.map((d) => d.value2 ?? 0) : [];

  const line1Path = buildPath(series1Values);
  const area1Path = buildAreaPath(series1Values);

  const line2Path = series2Values.length > 0 ? buildPath(series2Values) : "";
  const area2Path = series2Values.length > 0 ? buildAreaPath(series2Values) : "";

  const activePoint = hoverIndex !== null && data[hoverIndex] ? data[hoverIndex] : null;

  return (
    <div
      ref={containerRef}
      className="revenue-chart-container"
      onMouseLeave={() => setHoverIndex(null)}
    >
      <div className="revenue-chart-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ background: series1Color }} />
          <span>{series1Name}</span>
        </div>
        {series2Name && (
          <div className="legend-item">
            <span className="legend-dot" style={{ background: series2Color }} />
            <span>{series2Name}</span>
          </div>
        )}
      </div>

      <div className="revenue-chart-svg-wrap" style={{ height }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${height}`}
          className="revenue-chart-svg"
        >
          <defs>
            <linearGradient id="chartGradient1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={series1Color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={series1Color} stopOpacity="0.0" />
            </linearGradient>
            {series2Name && (
              <linearGradient id="chartGradient2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={series2Color} stopOpacity="0.18" />
                <stop offset="100%" stopColor={series2Color} stopOpacity="0.0" />
              </linearGradient>
            )}
          </defs>

          {/* Grid lines & Y axis ticks */}
          {yTicks.map((val) => {
            const y = getY(val);
            return (
              <g key={val} className="chart-grid-row">
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#f1ede8"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="chart-axis-label"
                >
                  {formatCompact(val)}
                </text>
              </g>
            );
          })}

          {/* Series 1 Area & Line */}
          <path d={area1Path} fill="url(#chartGradient1)" />
          <path
            d={line1Path}
            fill="none"
            stroke={series1Color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Series 2 Area & Line (if available) */}
          {series2Name && (
            <>
              <path d={area2Path} fill="url(#chartGradient2)" />
              <path
                d={line2Path}
                fill="none"
                stroke={series2Color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* X Axis Labels */}
          {data.map((d, idx) => {
            // Intelligent step so labels don't collide
            const total = data.length;
            const minSpacing = 55; // min pixels between x labels
            const maxLabels = Math.max(Math.floor(chartWidth / minSpacing), 2);
            const step = Math.ceil(total / maxLabels);

            const isFirst = idx === 0;
            const isLast = idx === total - 1;
            const isStep = idx % step === 0;

            if (!isFirst && !isLast && !isStep) return null;
            // Avoid collision near the last item
            if (!isLast && total - 1 - idx < Math.floor(step * 0.75)) return null;

            const x = getX(idx);
            return (
              <text
                key={d.label + idx}
                x={x}
                y={height - 8}
                textAnchor="middle"
                className="chart-axis-label"
              >
                {d.label}
              </text>
            );
          })}

          {/* Hover indicator line & dots */}
          {hoverIndex !== null && data[hoverIndex] && (
            <g className="chart-hover-indicator">
              <line
                x1={getX(hoverIndex)}
                y1={paddingTop}
                x2={getX(hoverIndex)}
                y2={paddingTop + chartHeight}
                stroke="#cbd5e1"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getY(data[hoverIndex].value1)}
                r="4.5"
                fill="#ffffff"
                stroke={series1Color}
                strokeWidth="2.5"
              />
              {series2Name && (
                <circle
                  cx={getX(hoverIndex)}
                  cy={getY(data[hoverIndex].value2 ?? 0)}
                  r="4"
                  fill="#ffffff"
                  stroke={series2Color}
                  strokeWidth="2.5"
                />
              )}
            </g>
          )}

          {/* Invisible interactive overlay bars for mouse hover */}
          {data.map((_, idx) => {
            const x = getX(idx) - (xStep / 2 || 20);
            return (
              <rect
                key={idx}
                x={Math.max(x, paddingLeft)}
                y={paddingTop}
                width={Math.max(xStep, 24)}
                height={chartHeight}
                fill="transparent"
                style={{ cursor: "pointer" }}
                tabIndex={0}
                role="button"
                aria-label={`${data[idx].fullDate}: ${series1Name} ${formatVnd(data[idx].value1)}`}
                onPointerEnter={() => setHoverIndex(idx)}
                onPointerDown={() => setHoverIndex(idx)}
                onFocus={() => setHoverIndex(idx)}
                onBlur={() => setHoverIndex(null)}
              />
            );
          })}
        </svg>

        {/* Floating tooltip */}
        {activePoint && hoverIndex !== null && (
          <div
            className="revenue-chart-tooltip"
            style={{
              left: `${(getX(hoverIndex) / svgWidth) * 100}%`,
              transform:
                hoverIndex > data.length / 2
                  ? "translateX(-105%)"
                  : "translateX(8%)",
            }}
          >
            <div className="tooltip-date">{activePoint.fullDate}</div>
            <div className="tooltip-row series1">
              <span className="tooltip-dot" style={{ background: series1Color }} />
              <span className="tooltip-name">{series1Name}:</span>
              <strong>{formatVnd(activePoint.value1)}</strong>
            </div>
            {series2Name && activePoint.value2 !== undefined && (
              <div className="tooltip-row series2">
                <span className="tooltip-dot" style={{ background: series2Color }} />
                <span className="tooltip-name">{series2Name}:</span>
                <strong>{formatVnd(activePoint.value2)}</strong>
              </div>
            )}
            {activePoint.count !== undefined && (
              <div className="tooltip-row count">
                <span className="tooltip-name">Số đơn hoàn thành:</span>
                <strong>{activePoint.count} đơn</strong>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
