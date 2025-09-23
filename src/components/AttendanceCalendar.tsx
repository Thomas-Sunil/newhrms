import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { Card, CardContent } from '@/components/ui/card';

export type AttendanceRecord = {
  date: Date;
  status: 'Present' | 'Absent' | 'On Leave';
};

interface AttendanceCalendarProps {
  attendanceRecords: AttendanceRecord[];
  month: Date;
  onMonthChange: (date: Date) => void;
}

const AttendanceCalendar = ({ attendanceRecords, month, onMonthChange }: AttendanceCalendarProps) => {

  const lowerCaseFirst = (str: string) => str.charAt(0).toLowerCase() + str.slice(1);

  const modifiers = {
    present: attendanceRecords
      .filter(r => r.status.toLowerCase() === 'present')
      .map(r => r.date),
    absent: attendanceRecords
      .filter(r => r.status.toLowerCase() === 'absent')
      .map(r => r.date),
    onLeave: attendanceRecords
      .filter(r => r.status.toLowerCase() === 'on leave')
      .map(r => r.date),
  };

  const modifierClassNames = {
    present: 'rdp-day_present',
    absent: 'rdp-day_absent',
    onLeave: 'rdp-day_onLeave',
  };

  const legendItems = [
    { status: 'Present', className: 'bg-green-500' },
    { status: 'Absent', className: 'bg-red-500' },
    { status: 'On Leave', className: 'bg-yellow-500' },
  ];

  return (
    <>
      <style>{`
        .rdp-day_present, .rdp-day_present:hover {
          background-color: #dcfce7; /* green-200 */
          color: #166534; /* green-800 */
        }
        .rdp-day_absent, .rdp-day_absent:hover {
          background-color: #fee2e2; /* red-200 */
          color: #991b1b; /* red-800 */
        }
        .rdp-day_onLeave, .rdp-day_onLeave:hover {
          background-color: #fef9c3; /* yellow-200 */
          color: #854d0e; /* yellow-800 */
        }
        .rdp-day_selected {
          background-color: hsl(var(--primary)) !important;
          color: hsl(var(--primary-foreground)) !important;
        }
      `}</style>
      <Card className="border-0 shadow-none">
        <CardContent className="p-0 flex justify-center">
          <DayPicker
            month={month}
            onMonthChange={onMonthChange}
            modifiers={modifiers}
            modifiersClassNames={modifierClassNames}
            showOutsideDays
            fixedWeeks
            classNames={{
              day_selected: '',
              day_today: 'text-primary font-bold',
              day: 'h-12 w-12 text-base rounded-full',
              head_cell: 'text-muted-foreground text-sm font-normal w-12',
              caption_label: 'text-lg font-medium',
              nav_button: 'h-8 w-8',
            }}
          />
        </CardContent>
      </Card>
      <div className="flex justify-center space-x-4 mt-4 border-t pt-4">
        {legendItems.map(({ status, className }) => (
          <div key={status} className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${className}`}></div>
            <span className="text-sm text-muted-foreground">{status}</span>
          </div>
        ))}
      </div>
    </>
  );
};

export default AttendanceCalendar;