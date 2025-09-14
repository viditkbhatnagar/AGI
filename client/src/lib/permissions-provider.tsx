import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './auth-provider';

type PermissionsContextType = {
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
  canGradeExams: boolean;
  canScheduleLiveClasses: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isViewOnly: boolean;
};

const PermissionsContext = createContext<PermissionsContextType | null>(null);

interface PermissionsProviderProps {
  children: ReactNode;
}

export function PermissionsProvider({ children }: PermissionsProviderProps) {
  const { userRole } = useAuth();
  
  const isSuperAdmin = userRole === 'superadmin';
  const isAdmin = userRole === 'admin';
  const isTeacher = userRole === 'teacher';
  const isViewOnly = isSuperAdmin; // Super admin has view-only access
  
  // Admins can do everything (except superadmin which is view-only)
  const canEdit = isAdmin && !isSuperAdmin;
  const canCreate = isAdmin && !isSuperAdmin; // Only admin can create (not teachers or superadmin)
  const canDelete = isAdmin && !isSuperAdmin;
  
  // Teachers have limited capabilities
  const canGradeExams = isTeacher || (isAdmin && !isSuperAdmin);
  const canScheduleLiveClasses = isTeacher || (isAdmin && !isSuperAdmin);

  const value = {
    canEdit,
    canCreate,
    canDelete,
    canGradeExams,
    canScheduleLiveClasses,
    isSuperAdmin,
    isAdmin,
    isTeacher,
    isViewOnly
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionsProvider");
  }
  return context;
}

// Helper hook for conditional rendering based on permissions
export function useConditionalRender() {
  const { canEdit, canCreate, canDelete, canGradeExams, canScheduleLiveClasses, isViewOnly, isAdmin, isSuperAdmin, isTeacher } = usePermissions();
  
  return {
    renderIfCanEdit: (component: ReactNode) => canEdit ? component : null,
    renderIfCanCreate: (component: ReactNode) => canCreate ? component : null,
    renderIfCanDelete: (component: ReactNode) => canDelete ? component : null,
    renderIfCanGradeExams: (component: ReactNode) => canGradeExams ? component : null,
    renderIfCanScheduleLiveClasses: (component: ReactNode) => canScheduleLiveClasses ? component : null,
    renderIfViewOnly: (component: ReactNode) => isViewOnly ? component : null,
    renderIfNotViewOnly: (component: ReactNode) => !isViewOnly ? component : null,
    canEdit,
    canCreate,
    canDelete,
    canGradeExams,
    canScheduleLiveClasses,
    isViewOnly,
    isAdmin,
    isSuperAdmin,
    isTeacher
  };
}