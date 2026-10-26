import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  Calendar as AriaCalendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarHeading,
  CalendarMonthPicker,
  CalendarYearPicker,
  Button as AriaButton,
} from "react-aria-components"
import {
  CalendarDate,
  getLocalTimeZone,
  today,
  parseDate,
} from "@internationalized/date"

import { cn } from "@/lib/utils"

/**
 * Safely converts any Date representation (CalendarDate, Date, ISO string) to CalendarDate.
 */
function toCalendarDate(date) {
  if (!date) return null
  if (date instanceof CalendarDate) return date
  if (date instanceof Date && !isNaN(date.getTime())) {
    return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
  }
  if (typeof date === "string" && date.trim()) {
    try {
      const datePart = date.split("T")[0]
      if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        return parseDate(datePart)
      }
      const d = new Date(date)
      if (!isNaN(d.getTime())) {
        return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
      }
    } catch {
      return null
    }
  }
  return null
}

/**
 * Converts a CalendarDate to a native JS Date in local time.
 */
function toJsDate(calendarDate) {
  if (!calendarDate) return null
  if (calendarDate instanceof Date) return calendarDate
  try {
    if (typeof calendarDate.toDate === "function") {
      return calendarDate.toDate(getLocalTimeZone())
    }
    return new Date(calendarDate.year, calendarDate.month - 1, calendarDate.day)
  } catch {
    return null
  }
}

/**
 * Month Dropdown for captionLayout="dropdown"
 */
function MonthDropdown() {
  return (
    <CalendarMonthPicker>
      {({ items, value, onChange, 'aria-label': ariaLabel }) => (
        <select
          aria-label={ariaLabel || 'Select month'}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="text-xs font-semibold bg-transparent border border-border/80 rounded px-1.5 py-0.5 cursor-pointer text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {items.map((item) => (
            <option key={item.id} value={item.id} className="bg-popover text-popover-foreground">
              {item.formatted}
            </option>
          ))}
        </select>
      )}
    </CalendarMonthPicker>
  )
}

/**
 * Year Dropdown for captionLayout="dropdown"
 */
function YearDropdown() {
  return (
    <CalendarYearPicker>
      {({ items, value, onChange, 'aria-label': ariaLabel }) => (
        <select
          aria-label={ariaLabel || 'Select year'}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="text-xs font-semibold bg-transparent border border-border/80 rounded px-1.5 py-0.5 cursor-pointer text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {items.map((item) => (
            <option key={item.id} value={item.id} className="bg-popover text-popover-foreground">
              {item.formatted}
            </option>
          ))}
        </select>
      )}
    </CalendarYearPicker>
  )
}

/**
 * Accessible shadcn Calendar component powered by react-aria-components and @internationalized/date.
 * Supports both React Aria (CalendarDate, value/onChange) and legacy React DayPicker (Date, selected/onSelect).
 */
function Calendar({
  className,
  value,
  onChange,
  selected,
  onSelect,
  captionLayout = "label",
  defaultValue,
  showOutsideDays = true,
  ...props
}) {
  // Support both 'value' and 'selected'
  const rawDate = value !== undefined ? value : selected
  const normalizedValue = React.useMemo(() => toCalendarDate(rawDate), [rawDate])

  const defaultVal = React.useMemo(() => {
    if (defaultValue) return toCalendarDate(defaultValue)
    return undefined
  }, [defaultValue])

  const handleChange = (newDateValue) => {
    if (onChange) {
      onChange(newDateValue)
    }
    if (onSelect) {
      onSelect(toJsDate(newDateValue))
    }
  }

  return (
    <AriaCalendar
      value={normalizedValue}
      defaultValue={defaultVal}
      onChange={handleChange}
      aria-label="Calendar"
      className={cn(
        "p-3 bg-background rounded-lg border shadow-xs select-none w-auto max-w-[280px]",
        className
      )}
      {...props}
    >
      {/* Calendar Header with Navigation Chevrons and Month/Year Caption */}
      <header className="flex items-center justify-between pb-3 px-1 relative">
        <AriaButton
          slot="previous"
          className="size-7 p-0 flex items-center justify-center rounded-md border border-border/60 bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </AriaButton>

        <div className="flex items-center gap-1.5">
          {captionLayout === "dropdown" ? (
            <div className="flex items-center gap-1.5">
              <MonthDropdown />
              <YearDropdown />
            </div>
          ) : (
            <CalendarHeading className="text-sm font-semibold text-foreground" />
          )}
        </div>

        <AriaButton
          slot="next"
          className="size-7 p-0 flex items-center justify-center rounded-md border border-border/60 bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </AriaButton>
      </header>

      {/* Calendar Grid mapping days of the week and dates */}
      <CalendarGrid className="w-full border-collapse">
        <CalendarGridHeader>
          {(day) => (
            <CalendarHeaderCell className="text-muted-foreground w-8 h-8 text-[0.8rem] font-medium text-center pb-1">
              {day}
            </CalendarHeaderCell>
          )}
        </CalendarGridHeader>
        <CalendarGridBody>
          {(date) => (
            <CalendarCell
              date={date}
              className={({ isSelected, isToday, isOutsideMonth, isDisabled }) =>
                cn(
                  "size-8 text-xs rounded-md flex items-center justify-center mx-auto transition-colors cursor-pointer outline-none select-none",
                  "focus-visible:ring-2 focus-visible:ring-ring",
                  // Selected state
                  isSelected
                    ? "bg-primary text-primary-foreground font-semibold hover:bg-primary hover:text-primary-foreground"
                    : "text-foreground hover:bg-muted font-normal",
                  // Today state (when not selected)
                  isToday && !isSelected && "bg-muted/70 font-semibold border border-border text-foreground",
                  // Outside month days
                  isOutsideMonth && !isSelected && (showOutsideDays ? "text-muted-foreground/40 font-normal hover:bg-transparent" : "invisible"),
                  // Disabled state
                  isDisabled && "text-muted-foreground/30 pointer-events-none cursor-not-allowed"
                )
              }
            />
          )}
        </CalendarGridBody>
      </CalendarGrid>
    </AriaCalendar>
  )
}

Calendar.displayName = "Calendar"

export { Calendar, toCalendarDate, toJsDate }
