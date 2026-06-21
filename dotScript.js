const container = document.getElementById("dotContainer");
const tooltip = document.getElementById("tooltip");
const root = document.querySelector(":root");
const progressBar = document.querySelector(".progress-bar");
const progressText = document.querySelector(".progress-text");

const daysSpan = document.querySelector("h1 span");
const hrsSpan = document.querySelector(".time.hours span");
const minSpan = document.querySelector(".time.mins span");
const secSpan = document.querySelector(".time.seconds span");

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const TIMELINE = {
  timeZone: "America/New_York",
  startDate: "2024-04-12",
  endDate: "2026-07-17",
  endTime: "20:00:00",
  progressStartDate: "2026-05-27",
  progressStartTime: "00:00:00",
  statusRanges: {
    trip: [{ start: "2024-05-27", end: "2024-05-30" }],
    together: [
      { start: "2024-04-12", end: "2024-06-01" },
      { start: "2024-12-30", end: "2025-01-10" },
      { start: "2025-04-08", end: "2025-04-18" },
      { start: "2025-05-25", end: "2025-06-01" },
      { start: "2025-08-27", end: "2025-09-01" },
      { start: "2025-12-28", end: "2026-01-02" },
      { start: "2026-01-15", end: "2026-01-31" },
      { start: "2026-05-19", end: "2026-05-27" },
    ],
    back: [{ start: "2026-07-17", end: "2026-07-17" }],
  },
};

const STATUS_PRIORITY = ["trip", "together", "back"];

// Time zone helpers
const timeZoneFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMELINE.timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function getFormatterParts(formatter, date) {
  return Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
}

function getDateParts(value) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    throw new Error(`Invalid timeline date: ${value}`);
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function getTimeParts(value) {
  const match = value.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    throw new Error(`Invalid timeline time: ${value}`);
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
    second: Number(match[3] || 0),
  };
}

function getTimeZoneOffsetMs(date) {
  const parts = getFormatterParts(timeZoneFormatter, date);
  const hour = parts.hour === 24 ? 0 : parts.hour;
  const zonedUtcTime = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    hour,
    parts.minute,
    parts.second,
  );

  return zonedUtcTime - date.getTime();
}

function getDateInTimeZone(dateValue, timeValue) {
  const dateParts = getDateParts(dateValue);
  const timeParts = getTimeParts(timeValue);
  const utcGuess = Date.UTC(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    timeParts.hour,
    timeParts.minute,
    timeParts.second,
  );

  let date = new Date(utcGuess - getTimeZoneOffsetMs(new Date(utcGuess)));
  date = new Date(utcGuess - getTimeZoneOffsetMs(date));
  return date;
}

function toDayNumber({ year, month, day }) {
  return Math.floor(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}

function getCurrentDayNumber() {
  return toDayNumber(getFormatterParts(timeZoneFormatter, new Date()));
}

// Calendar day helpers
function daysBetween(start, end) {
  return toDayNumber(getDateParts(end)) - toDayNumber(getDateParts(start));
}

function compileStatusRanges(statusRanges, timelineStartDate) {
  const compiled = {};
  for (const [status, ranges] of Object.entries(statusRanges)) {
    compiled[status] = ranges.map((range) => ({
      start: daysBetween(timelineStartDate, range.start),
      end: daysBetween(timelineStartDate, range.end),
    }));
  }
  return compiled;
}

function isInAnyRange(dayIndex, ranges) {
  return ranges.some(
    (range) => dayIndex >= range.start && dayIndex <= range.end,
  );
}

// Derived timeline values
const timelineStartDay = toDayNumber(getDateParts(TIMELINE.startDate));
const countdownEnd = getDateInTimeZone(TIMELINE.endDate, TIMELINE.endTime);
const progressStart = getDateInTimeZone(
  TIMELINE.progressStartDate,
  TIMELINE.progressStartTime,
);
const compiledStatusRanges = compileStatusRanges(
  TIMELINE.statusRanges,
  TIMELINE.startDate,
);
const totalDays = daysBetween(TIMELINE.startDate, TIMELINE.endDate);
const totalDots = totalDays + 1;
let renderedDotNum = null;

function getCurrentDotNum() {
  return getCurrentDayNumber() - timelineStartDay;
}

// Countdown and progress
function updateProgress() {
  const now = new Date();
  const total = countdownEnd - progressStart;
  const current = now - progressStart;
  const progress = Math.min(100, Math.max(0, (current / total) * 100));

  let startProgress = parseFloat(progressBar.style.width) || 0;
  const duration = 2000;
  const startTime = performance.now();

  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress_fraction = Math.min(elapsed / duration, 1);

    // Calculate current progress using easeOutQuad easing
    const currentProgress =
      startProgress +
      (progress - startProgress) * (1 - Math.pow(1 - progress_fraction, 2));

    // Update both the bar and text
    progressBar.style.width = `${currentProgress}%`;
    progressText.textContent = `${Math.round(currentProgress)}%`;

    if (progress_fraction < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

function updateTimes() {
  const now = new Date();
  const diffRemaining = Math.max(0, countdownEnd - now);
  const daysRemaining = Math.floor(diffRemaining / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.floor(diffRemaining / (1000 * 60 * 60));
  const minsRemaining = Math.floor(diffRemaining / (1000 * 60));
  const secondsRemaining = Math.floor(diffRemaining / 1000);

  daysSpan.innerHTML = daysRemaining;
  hrsSpan.innerHTML = hoursRemaining;
  minSpan.innerHTML = minsRemaining;
  secSpan.innerHTML = secondsRemaining;
}

function calculateDotSize() {
  const containerWidth = container.offsetWidth;
  if (containerWidth < 400) return 3;
  if (containerWidth < 768) return 4;
  if (containerWidth < 1024) return 6;
  return 12;
}

function calculateGapSize(dotSize) {
  return dotSize / 0.85;
}

// Dot rendering
function getStatusForDay(dayIndex, todayIndex, statusRanges) {
  for (const status of STATUS_PRIORITY) {
    if (isInAnyRange(dayIndex, statusRanges[status] || [])) {
      return status;
    }
  }

  if (dayIndex === todayIndex) {
    return "curr";
  } else if (dayIndex > todayIndex) {
    return "pending";
  } else {
    return "complete";
  }
}

function formatTimelineDate(dayOffset) {
  const startParts = getDateParts(TIMELINE.startDate);
  const date = new Date(
    Date.UTC(
      startParts.year,
      startParts.month - 1,
      startParts.day + dayOffset,
    ),
  );
  const shortMonth = date.toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC",
  });

  return `${shortMonth} ${String(date.getUTCDate()).padStart(2, "0")}`;
}

// Tooltip behavior
function setupDotListeners(dot, index) {
  const handleMouseEnter = (e) => {
    const rect = e.target.getBoundingClientRect();
    const label = formatTimelineDate(index);

    tooltip.textContent = label;

    // Calculate positions
    const dotCenterX = rect.left + rect.width / 2;
    const dotTopY = rect.top;

    tooltip.style.display = "block";
    const tooltipRect = tooltip.getBoundingClientRect();

    let left = dotCenterX - tooltipRect.width / 2;
    let top = dotTopY - tooltipRect.height - 8;

    // Adjust if tooltip would go off screen
    if (left < 0) left = 0;
    if (left + tooltipRect.width > window.innerWidth) {
      left = window.innerWidth - tooltipRect.width;
    }

    // If tooltip would go above viewport, show it below the dot instead
    if (top < 0) {
      top = rect.bottom + 8;
    }

    // Apply positions
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;

    // Make visible with transition
    requestAnimationFrame(() => {
      tooltip.classList.add("visible");
    });
  };

  const handleMouseLeave = () => {
    tooltip.classList.remove("visible");
    setTimeout(() => {
      if (!tooltip.classList.contains("visible")) {
        tooltip.style.display = "none";
      }
    }, 400); // Match transition duration
  };

  // Touch support
  const handleTouch = (e) => {
    e.preventDefault();
    const wasPreviouslyShown = tooltip.classList.contains("visible");

    // Hide any existing tooltip
    if (wasPreviouslyShown) {
      handleMouseLeave();
    } else {
      handleMouseEnter(e);
      // Auto-hide tooltip after 1.5 seconds on touch devices
      setTimeout(handleMouseLeave, 1500);
    }
  };

  // Add event listeners
  dot.addEventListener("mouseenter", handleMouseEnter);
  dot.addEventListener("mouseleave", handleMouseLeave);
  dot.addEventListener("touchstart", handleTouch);
}

function createDots(totalDots) {
  const dotSize = calculateDotSize();
  const gapSize = calculateGapSize(dotSize);
  const currDotNum = getCurrentDotNum();
  renderedDotNum = currDotNum;

  container.innerHTML = "";

  root.style.setProperty("--dotSize", `${dotSize}px`);
  container.style.setProperty("--gapSize", `${gapSize}px`);

  // Create all dots
  for (let i = 0; i < totalDots; i++) {
    const dot = document.createElement("div");
    const dotColor = getStatusForDay(i, currDotNum, compiledStatusRanges);
    dot.className = `dot ${dotColor}`;
    setupDotListeners(dot, i);

    container.appendChild(dot);
  }
}

// Startup
function setupResizeObserver() {
  const resizeObserver = new ResizeObserver((entries) => {
    for (let entry of entries) {
      if (entry.target === container) {
        createDots(totalDots);
      }
    }
  });

  resizeObserver.observe(container);
}

setupResizeObserver();
updateTimes();
updateProgress();
setInterval(() => {
  updateTimes();
  updateProgress();
  if (getCurrentDotNum() !== renderedDotNum) {
    createDots(totalDots);
  }
}, 1000);

createDots(totalDots);
