import {
  Button,
  CalendarCell,
  CalendarGrid,
  DateInput,
  DateRangePicker as AriaDateRangePicker,
  DateSegment,
  Dialog,
  Group,
  Heading,
  Label,
  Popover,
  RangeCalendar,
  type DateValue,
} from 'react-aria-components'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import './DateRangePickerAria.css'

interface DateRangePickerProps {
  label?: string
  value?: { start: DateValue | null; end: DateValue | null }
  onChange?: (value: { start: DateValue | null; end: DateValue | null }) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TypedDateRangePicker = AriaDateRangePicker as any

export function DateRangePickerAria({ label = 'Fecha', value, onChange }: DateRangePickerProps) {
  return (
    <TypedDateRangePicker
      value={value}
      onChange={onChange}
      className="date-range-picker-custom"
    >
      <Label className="text-sm font-medium text-[#114C5F] mb-2 block">{label}</Label>
      <Group className="date-range-group">
        <DateInput slot="start" className="date-input">
          {(segment) => <DateSegment segment={segment} className="date-segment" />}
        </DateInput>
        <span aria-hidden="true" className="date-separator">–</span>
        <DateInput slot="end" className="date-input">
          {(segment) => <DateSegment segment={segment} className="date-segment" />}
        </DateInput>
        <Button className="calendar-button">
          <ChevronDown size={20} />
        </Button>
      </Group>
      <Popover className="date-popover">
        <Dialog className="date-dialog">
          <RangeCalendar className="range-calendar">
            <header className="calendar-header">
              <Button slot="previous" className="nav-button">
                <ChevronLeft size={20} />
              </Button>
              <Heading className="calendar-heading" />
              <Button slot="next" className="nav-button">
                <ChevronRight size={20} />
              </Button>
            </header>
            <CalendarGrid className="calendar-grid">
              {(date) => <CalendarCell date={date} className="calendar-cell" />}
            </CalendarGrid>
          </RangeCalendar>
        </Dialog>
      </Popover>
    </TypedDateRangePicker>
  )
}
