import { useQuery } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * A dropdown of the platform's existing students. Selecting one sets the value to the
 * student's LOGIN EMAIL — which AGI Utah uses as the studentRef — so admins never type an
 * email and there's no chance of a typo. Reuses the app's `/api/admin/students` query.
 */

interface RawStudent {
  name?: string;
  userId?: { email?: string; username?: string };
}

interface StudentOption {
  email: string;
  name: string;
}

interface StudentPickerProps {
  value: string;
  onChange: (email: string) => void;
  label?: string;
}

export function StudentPicker({ value, onChange, label = 'Student' }: StudentPickerProps) {
  const query = useQuery<RawStudent[]>({ queryKey: ['/api/admin/students'] });

  const options: StudentOption[] = (query.data ?? [])
    .map((s) => ({
      email: s.userId?.email ?? '',
      name: s.name ?? s.userId?.username ?? s.userId?.email ?? 'Unknown',
    }))
    .filter((s) => s.email.length > 0);

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={query.isLoading ? 'Loading students…' : 'Select a student'} />
        </SelectTrigger>
        <SelectContent>
          {options.map((s) => (
            <SelectItem key={s.email} value={s.email}>
              {s.name} — {s.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
