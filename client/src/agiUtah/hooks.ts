import { useMutation, useQuery } from '@tanstack/react-query';
import { agiUtahApi, type EnrollInput, type GradeInput, type AttendanceInput } from './api';

/**
 * TanStack Query hooks for the AGI Utah API. Isolated: used only by the AGI Utah screens.
 */

export function useBootstrap() {
  return useMutation({ mutationFn: () => agiUtahApi.bootstrap() });
}

export function useLoadCatalog() {
  return useMutation({ mutationFn: () => agiUtahApi.loadCatalog() });
}

export function useExpandIntake() {
  return useMutation({ mutationFn: (key: string) => agiUtahApi.expandIntake(key) });
}

export function useEnroll() {
  return useMutation({ mutationFn: (input: EnrollInput) => agiUtahApi.enroll(input) });
}

export function useGrade() {
  return useMutation({ mutationFn: (input: GradeInput) => agiUtahApi.grade(input) });
}

export function useRecordAttendance() {
  return useMutation({ mutationFn: (input: AttendanceInput) => agiUtahApi.recordAttendance(input) });
}

export function useContactLedger(studentRef: string, enabled = true) {
  return useQuery({
    queryKey: ['agi-utah', 'contact-ledger', studentRef],
    queryFn: () => agiUtahApi.contactLedger(studentRef),
    enabled: enabled && studentRef.length > 0,
  });
}

export function useEarnedCredentials(studentRef: string, enabled = true) {
  return useQuery({
    queryKey: ['agi-utah', 'earned-credentials', studentRef],
    queryFn: () => agiUtahApi.earnedCredentials(studentRef),
    enabled: enabled && studentRef.length > 0,
  });
}
