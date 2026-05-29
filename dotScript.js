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
  startDate: "2024-04-12T00:00:00",
  endDate: "2026-07-17T00:00:00",
  progressStartDate: "2026-05-27T00:00:00",
  statusRanges: {
    trip: [{ start: "2024-05-27T00:00:00", end: "2024-05-30T00:00:00" }],
    together: [
      { start: "2024-04-12T00:00:00", end: "2024-06-01T00:00:00" },
      { start: "2024-12-30T00:00:00", end: "2025-01-10T00:00:00" },
      { start: "2025-04-08T00:00:00", end: "2025-04-18T00:00:00" },
      { start: "2025-05-25T00:00:00", end: "2025-06-01T00:00:00" },
      { start: "2025-08-27T00:00:00", end: "2025-09-01T00:00:00" },
      { start: "2025-12-28T00:00:00", end: "2026-01-02T00:00:00" },
      { start: "2026-01-15T00:00:00", end: "2026-01-31T00:00:00" },
      { start: "2026-05-19T00:00:00", end: "2026-05-27T00:00:00" },
    ],
    back: [{ start: "2026-07-17T00:00:00", end: "2026-07-17T00:00:00" }],
  },
};

const STATUS_PRIORITY = ["trip", "together", "back"];

function parseDate(value) {
  return new Date(value);
}

function daysBetween(start, end) {
  return Math.floor((end - start) / MS_PER_DAY);
}

function compileStatusRanges(statusRanges, start) {
  const compiled = {};
  for (const [status, ranges] of Object.entries(statusRanges)) {
    compiled[status] = ranges.map((range) => ({
      start: daysBetween(start, parseDate(range.start)),
      end: daysBetween(start, parseDate(range.end)),
    }));
  }
  return compiled;
}

function isInAnyRange(dayIndex, ranges) {
  return ranges.some(
    (range) => dayIndex >= range.start && dayIndex <= range.end,
  );
}

const startDate = parseDate(TIMELINE.startDate);
const endDate = parseDate(TIMELINE.endDate);
const progressStartDate = parseDate(TIMELINE.progressStartDate);
const compiledStatusRanges = compileStatusRanges(
  TIMELINE.statusRanges,
  startDate,
);
const totalDays = daysBetween(startDate, endDate);
const totalDots = totalDays + 1;

const currDotNum = daysBetween(startDate, new Date());

function updateProgress() {
  const now = new Date();
  const start = progressStartDate;
  const end = endDate;
  const total = end - start;
  const current = now - start;
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
  const end = endDate;
  const diffRemaining = end - now;
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

function formatDate(days) {
  const newDate = new Date(startDate);
  newDate.setDate(newDate.getDate() + days);
  const dateString = newDate.toDateString().split(" ");
  const shortDate = `${dateString[1]} ${dateString[2]}`;
  return shortDate;
}

function setupDotListeners(dot, index) {
  const handleMouseEnter = (e) => {
    const rect = e.target.getBoundingClientRect();
    const label = formatDate(index);

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

function debounce(func, wait) {
  let timeout = null;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

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
}, 1000);

createDots(totalDots);
