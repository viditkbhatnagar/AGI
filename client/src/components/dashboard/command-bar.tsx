import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Users,
    School,
    GraduationCap,
    CalendarClock,
    BarChart,
    FileText,
    Settings,
} from 'lucide-react';

interface CommandItem {
    icon: typeof Users;
    label: string;
    path: string;
    group: string;
}

/**
 * Global command bar for quick navigation
 * Activated with Ctrl/Cmd+K
 */
export function CommandBar() {
    const [open, setOpen] = useState(false);
    const [, setLocation] = useLocation();

    const commands: CommandItem[] = [
        { icon: Users, label: 'Students', path: '/admin/students', group: 'Main' },
        { icon: School, label: 'Courses', path: '/admin/courses', group: 'Main' },
        { icon: GraduationCap, label: 'Enrollments', path: '/admin/enrollments', group: 'Main' },
        { icon: CalendarClock, label: 'Live Classes', path: '/admin/live-classes', group: 'Main' },
        { icon: BarChart, label: 'Dashboard', path: '/admin/dashboard', group: 'Main' },
        { icon: FileText, label: 'Quiz Repository', path: '/admin/quiz-repository', group: 'Content' },
        { icon: Settings, label: 'Settings', path: '/admin/settings', group: 'Other' },
    ];

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const handleSelect = (path: string) => {
        setOpen(false);
        setLocation(path);
    };

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Search for pages, actions..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                {['Main', 'Content', 'Other'].map((group) => {
                    const groupCommands = commands.filter((cmd) => cmd.group === group);
                    if (groupCommands.length === 0) return null;

                    return (
                        <CommandGroup key={group} heading={group}>
                            {groupCommands.map((cmd) => (
                                <CommandItem
                                    key={cmd.path}
                                    onSelect={() => handleSelect(cmd.path)}
                                    className="flex items-center gap-3"
                                >
                                    <cmd.icon className="h-4 w-4" />
                                    <span>{cmd.label}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    );
                })}
            </CommandList>
        </CommandDialog>
    );
}
