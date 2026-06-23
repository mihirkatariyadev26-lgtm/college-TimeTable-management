import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import SlotCreationModal from "../components/SlotCreationModal";
import SlotEditModal from "../components/SlotEditModal";
import InitiateSwapModal from "../components/InitiateSwapModal";
import { useAuth } from "../context/AuthContext";
// ─── Helpers ──────────────────────────────────────────────────
const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_FULL = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8];

/** Return the 6 working days of the ISO week that contains `baseDate`. */
function getWeekDates(baseDate) {
  const d = new Date(baseDate);
  const day = d.getDay(); // 0 Sun … 6 Sat
  const mon = new Date(d);
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 6 }, (_, i) => {
    const dt = new Date(mon);
    dt.setDate(mon.getDate() + i);
    return dt;
  });
}

/** Format Date → 'YYYY-MM-DD' (local time, so the backend's UTC parse aligns). */
const toISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

/** Format Date → short label like 'Mon 19' */
const toLabel = (d) =>
  `${DAYS_SHORT[d.getDay() === 0 ? 5 : d.getDay() - 1]} ${d.getDate()}`;

// ─── Icons ────────────────────────────────────────────────────
const ArrowLeftIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);
const ChevronLeftIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const ChevronRightIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const PlusIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const CalendarIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const RefreshIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

// ─── Slot Card ────────────────────────────────────────────────
const SlotCard = ({ slot, onSlotClick, isClickable }) => {
  const isFree = slot.isFreeLecture;
  const isOverride = slot.isExceptionOverride;

  const cls = [
    "slot-card",
    isFree ? "slot-card--free" : "slot-card--active",
    isOverride ? "slot-card--override" : "",
    isClickable ? "slot-card--clickable" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cls}
      onClick={isClickable ? () => onSlotClick(slot) : undefined}
      role={isClickable ? "button" : undefined}>
      <div className="slot-card__num">Slot {slot.slotNumber}</div>

      {isFree ? (
        <div className="slot-card__free-label">
          {slot.subject === "No Lecture" ? "No Lecture" : slot.subject}
        </div>
      ) : (
        <>
          <div className="slot-card__subject">{slot.subject}</div>
          {slot.teacher && (
            <div className="slot-card__teacher">{slot.teacher.name}</div>
          )}
          {isOverride && (
            <span className="slot-card__badge slot-card__badge--override">
              Override
            </span>
          )}
        </>
      )}
    </div>
  );
};

// ─── Desktop Grid View ────────────────────────────────────────
const DesktopGridView = ({
  weekDates,
  timetableByDay,
  loading,
  loadingDay,
  onSlotClick,
  currentUserId,
  isTeacher,
  isAdmin,
}) => (
  <div className="tt-grid-wrapper">
    <div className="tt-grid">
      {/* Header row */}
      <div className="tt-grid__corner">Slot</div>
      {weekDates.map((d, i) => (
        <div
          key={i}
          className={`tt-grid__day-header ${toISO(d) === toISO(new Date()) ? "tt-grid__day-header--today" : ""}`}>
          <span className="tt-grid__day-name">{DAYS_FULL[i]}</span>
          <span className="tt-grid__day-date">
            {d.getDate()}/{d.getMonth() + 1}
          </span>
        </div>
      ))}

      {/* Slot rows */}
      {SLOTS.map((slotNum) => (
        <React.Fragment key={slotNum}>
          <div className="tt-grid__slot-label">S{slotNum}</div>
          {weekDates.map((d, dayIdx) => {
            const dayKey = DAYS_FULL[dayIdx];
            const slots = timetableByDay[dayKey];
            const slot = slots?.find((s) => s.slotNumber === slotNum);
            const isLoading = loading || loadingDay === dayKey;

            return (
              <div key={dayIdx} className="tt-grid__cell">
                {isLoading ? (
                  <div className="tt-grid__cell-skeleton" />
                ) : slot ? (
                  <SlotCard
                    slot={slot}
                    onSlotClick={(s) => onSlotClick(s, d)}
                    isClickable={
                      (isTeacher &&
                        !slot.isFreeLecture &&
                        slot.teacher?._id !== currentUserId) ||
                      (isAdmin && slot._id && !slot.isExceptionOverride)
                    }
                  />
                ) : (
                  <div className="tt-grid__cell-empty">—</div>
                )}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  </div>
);

// ─── Mobile Swipe Cards ───────────────────────────────────────
const MobileCardsView = ({
  weekDates,
  timetableByDay,
  activeDay,
  onDayChange,
  loading,
  onSlotClick,
  currentUserId,
  isTeacher,
  isAdmin,
}) => {
  const trackRef = useRef(null);
  const startXRef = useRef(null);

  const handleTouchStart = (e) => {
    startXRef.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    if (startXRef.current === null) return;
    const diff = startXRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) < 40) return;
    if (diff > 0 && activeDay < 5) onDayChange(activeDay + 1);
    if (diff < 0 && activeDay > 0) onDayChange(activeDay - 1);
    startXRef.current = null;
  };

  const dayKey = DAYS_FULL[activeDay];
  const slots = timetableByDay[dayKey] ?? [];

  return (
    <div className="mobile-tt">
      {/* Calendar tab bar */}
      <div className="mobile-tt__tabbar">
        <button
          className="mobile-tt__arrow"
          onClick={() => onDayChange(Math.max(0, activeDay - 1))}
          disabled={activeDay === 0}
          aria-label="Previous day">
          <ChevronLeftIcon />
        </button>
        <div className="mobile-tt__tabs">
          {weekDates.map((d, i) => (
            <button
              key={i}
              className={`mobile-tt__tab ${i === activeDay ? "mobile-tt__tab--active" : ""} ${toISO(d) === toISO(new Date()) ? "mobile-tt__tab--today" : ""}`}
              onClick={() => onDayChange(i)}
              aria-label={DAYS_FULL[i]}>
              <span className="mobile-tt__tab-day">{DAYS_SHORT[i]}</span>
              <span className="mobile-tt__tab-num">{d.getDate()}</span>
            </button>
          ))}
        </div>
        <button
          className="mobile-tt__arrow"
          onClick={() => onDayChange(Math.min(5, activeDay + 1))}
          disabled={activeDay === 5}
          aria-label="Next day">
          <ChevronRightIcon />
        </button>
      </div>

      {/* Swipeable card deck */}
      <div
        ref={trackRef}
        className="mobile-tt__deck"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}>
        {loading ? (
          SLOTS.map((n) => (
            <div
              key={n}
              className="slot-card slot-card--active slot-card--skeleton"
            />
          ))
        ) : slots.length === 0 ? (
          <div className="mobile-tt__empty">
            No slots scheduled for this day.
          </div>
        ) : (
          SLOTS.map((slotNum) => {
            const slot = slots.find((s) => s.slotNumber === slotNum);
            return slot ? (
              <SlotCard
                key={slotNum}
                slot={slot}
                onSlotClick={(s) => onSlotClick(s, weekDates[activeDay])}
                isClickable={
                  (isTeacher &&
                    !slot.isFreeLecture &&
                    slot.teacher?._id !== currentUserId) ||
                  (isAdmin && slot._id && !slot.isExceptionOverride)
                }
              />
            ) : (
              <div key={slotNum} className="slot-card slot-card--free">
                <div className="slot-card__num">Slot {slotNum}</div>
                <div className="slot-card__free-label">No Lecture</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// ─── Timetable View Page ──────────────────────────────────────
const TimetableView = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Filter params
  const isStudent = user?.role === "Student";
  const isAdmin = user?.role === "Admin";

  const [semester, setSemester] = useState(
    isStudent ? String(user.semester) : "",
  );
  const [division, setDivision] = useState(
    isStudent ? (user.division ?? "") : "",
  );

  // Week state
  const [baseDate, setBaseDate] = useState(new Date());
  const weekDates = getWeekDates(baseDate);

  // Data: map of dayName → slots array
  const [timetableByDay, setTimetableByDay] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Mobile
  const todayIdx = Math.max(0, Math.min(5, (new Date().getDay() + 5) % 7)); // Mon=0
  const [activeDay, setActiveDay] = useState(todayIdx);

  // Admin modal
  const [modalOpen, setModalOpen] = useState(false);
  const { showToast } = useAuth();

  // Swap Modal
  const isTeacher = user?.role === "Teacher";
  const currentUserId = user?._id || user?.id;
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapTargetSlot, setSwapTargetSlot] = useState(null);
  const [swapDate, setSwapDate] = useState(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTargetSlot, setEditTargetSlot] = useState(null);
  const [editDate, setEditDate] = useState(null);

  const handleSlotClick = (slot, dateObj) => {
    if (isAdmin && slot._id && !slot.isExceptionOverride) {
      setEditTargetSlot(slot);
      setEditDate(dateObj);
      setEditModalOpen(true);
      return;
    }

    if (!isTeacher) return;
    if (slot.isFreeLecture || slot.teacher?._id === currentUserId) return;
    setSwapTargetSlot(slot);
    setSwapDate(dateObj);
    setSwapModalOpen(true);
  };

  // ── Fetch whole week at once ──────────────────────────────
  const fetchWeek = useCallback(async () => {
    if (!semester || !division) return;
    setError("");
    setLoading(true);
    setTimetableByDay({});

    try {
      const results = await Promise.all(
        weekDates.map((d) =>
          api
            .get("/api/timetable/view", {
              params: { date: toISO(d), semester, division },
            })
            .then((r) => ({
              day: DAYS_FULL[weekDates.indexOf(d)],
              slots: r.data?.data ?? [],
            }))
            .catch(() => ({ day: DAYS_FULL[weekDates.indexOf(d)], slots: [] })),
        ),
      );

      const map = {};
      results.forEach(({ day, slots }) => {
        map[day] = slots;
      });
      setTimetableByDay(map);
    } catch (err) {
      setError(err.response?.data?.message ?? "Failed to load timetable.");
    } finally {
      setLoading(false);
    }
  }, [semester, division, baseDate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchWeek();
  }, [fetchWeek]);

  // ── Week nav ──────────────────────────────────────────────
  const prevWeek = () =>
    setBaseDate((d) => {
      const n = new Date(d);
      n.setDate(n.getDate() - 7);
      return n;
    });
  const nextWeek = () =>
    setBaseDate((d) => {
      const n = new Date(d);
      n.setDate(n.getDate() + 7);
      return n;
    });
  const goToday = () => {
    setBaseDate(new Date());
    setActiveDay(todayIdx);
  };

  const weekLabel = (() => {
    const s = weekDates[0],
      e = weekDates[5];
    return `${s.getDate()} ${s.toLocaleString("default", { month: "short" })} — ${e.getDate()} ${e.toLocaleString("default", { month: "short" })} ${e.getFullYear()}`;
  })();

  const handleSlotCreated = (newSlot) => {
    showToast(
      `Slot created: ${newSlot.subject} on ${newSlot.dayOfWeek}`,
      "success",
    );
    fetchWeek();
  };

  return (
    <div className="screen screen--tt" aria-label="Timetable View">
      <div className="glow glow--indigo-tl" />
      <div className="glow glow--violet-br" />

      <div className="tt-page">
        {/* ── Top bar ──────────────────────────────────────── */}
        <div className="tt-topbar">
          <div className="tt-topbar__left">
            <button
              className="btn-back"
              onClick={() =>
                navigate(`/${user?.role?.toLowerCase()}/dashboard`)
              }>
              <ArrowLeftIcon /> Dashboard
            </button>
          </div>
          <div className="tt-topbar__center">
            <CalendarIcon />
            <span className="tt-topbar__title">Timetable</span>
          </div>
          <div className="tt-topbar__right">
            <span className="admin-panel__user-name">{user?.name}</span>
            <button className="btn-text btn-text--muted" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>

        {/* ── Filters ──────────────────────────────────────── */}
        {!isStudent && (
          <div className="tt-filters">
            <div className="field" style={{ flex: 1 }}>
              <label className="field__label" htmlFor="tt-semester">
                Semester
              </label>
              <select
                id="tt-semester"
                className="field__input field__input--plain field__select"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}>
                <option value="">— Select —</option>
                {SEMESTERS.map((s) => (
                  <option key={s} value={s}>
                    Sem {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label className="field__label" htmlFor="tt-division">
                Division
              </label>
              <input
                id="tt-division"
                className="field__input field__input--plain"
                type="text"
                placeholder="e.g. A"
                value={division}
                onChange={(e) => setDivision(e.target.value.toUpperCase())}
              />
            </div>
            <button
              className="btn-icon"
              onClick={fetchWeek}
              style={{ marginTop: "1.4rem" }}>
              <RefreshIcon /> Refresh
            </button>
            {isAdmin && (
              <button
                id="btn-add-slot"
                className="btn btn--primary"
                onClick={() => setModalOpen(true)}
                style={{
                  marginTop: "1.4rem",
                  width: "auto",
                  padding: "0.65rem 1.25rem",
                }}>
                <PlusIcon /> Add Slot
              </button>
            )}
          </div>
        )}

        {/* ── Week nav ─────────────────────────────────────── */}
        <div className="tt-weeknav">
          <button
            className="tt-weeknav__btn"
            onClick={prevWeek}
            aria-label="Previous week">
            <ChevronLeftIcon />
          </button>
          <span className="tt-weeknav__label">{weekLabel}</span>
          <button
            className="tt-weeknav__btn"
            onClick={goToday}
            aria-label="Go to today">
            Today
          </button>
          <button
            className="tt-weeknav__btn"
            onClick={nextWeek}
            aria-label="Next week">
            <ChevronRightIcon />
          </button>
        </div>

        {/* ── Error ────────────────────────────────────────── */}
        {error && (
          <div
            className="reg-result-banner reg-result-banner--error"
            style={{ margin: "0 0 var(--space-4)" }}>
            {error}
          </div>
        )}

        {/* ── No filter prompt ─────────────────────────────── */}
        {(!semester || !division) && !isStudent && (
          <div className="tt-empty-prompt">
            Select a semester and division above to view the timetable.
          </div>
        )}

        {/* ── Desktop grid (hidden on mobile via CSS) ───────── */}
        {semester && division && (
          <>
            <div className="tt-desktop-view">
              <DesktopGridView
                weekDates={weekDates}
                timetableByDay={timetableByDay}
                loading={loading}
                onSlotClick={handleSlotClick}
                currentUserId={currentUserId}
                isTeacher={isTeacher}
                isAdmin={isAdmin}
              />
            </div>

            {/* ── Mobile swipe cards ────────────────────────── */}
            <div className="tt-mobile-view">
              <MobileCardsView
                weekDates={weekDates}
                timetableByDay={timetableByDay}
                activeDay={activeDay}
                onDayChange={setActiveDay}
                loading={loading}
                onSlotClick={handleSlotClick}
                currentUserId={currentUserId}
                isTeacher={isTeacher}
                isAdmin={isAdmin}
              />
            </div>
          </>
        )}
      </div>

      {/* ── Admin slot creation & edit modals ─────────────────────── */}
      {isAdmin && (
        <>
          <SlotCreationModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            onSuccess={handleSlotCreated}
            prefill={{ semester, division }}
          />
          <SlotEditModal
            isOpen={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            onSuccess={(updatedSlot, action) => {
              showToast(`Slot ${action} successfully!`, "success");
              fetchWeek();
            }}
            slot={editTargetSlot}
            dayOfWeek={editDate ? DAYS_FULL[editDate.getDay() - 1] : ''}
            semester={semester}
            division={division}
          />
        </>
      )}

      {/* ── Teacher Initiate Swap Modal ─────────────────────── */}
      {isTeacher && (
        <InitiateSwapModal
          isOpen={swapModalOpen}
          onClose={() => setSwapModalOpen(false)}
          targetSlot={swapTargetSlot}
          date={swapDate}
        />
      )}
    </div>
  );
};

export default TimetableView;
